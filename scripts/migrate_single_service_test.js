import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const csvDir = path.join(__dirname, '../csv_antigos');

async function readCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });
}

function parseDate(dateStr, timeStr = '00:00:00') {
    if (!dateStr || dateStr === '\\N') return null;
    const datePart = dateStr.split(' ')[0];
    return `${datePart}T${timeStr}`;
}

async function migrateSingleServiceTest() {
    console.log('🧪 Starting Single Service Migration Test...');

    // 1. Load Data
    console.log('📂 Loading CSVs...');
    const servicos = await readCSV(path.join(csvDir, 'servicos.csv'));
    const usuarios = await readCSV(path.join(csvDir, 'usuario.csv'));
    const enderecos = await readCSV(path.join(csvDir, 'endereco.csv'));

    // Load Report for better data
    const reportPath = path.join(csvDir, 'relatorio_agendamentos.csv');
    const reportContent = fs.readFileSync(reportPath, 'utf-8'); // Assuming utf-8 for now
    const reportRecords = parse(reportContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        relax_quotes: true
    });

    const reportMap = {};
    reportRecords.forEach(r => {
        reportMap[r.Id] = r;
    });

    console.log(`📊 Total Services in CSV: ${servicos.length}`);
    console.log(`📊 Total Reports: ${reportRecords.length}`);

    // 2. Build Maps
    console.log('🗺️ Building Maps...');

    const brokerGroupMap = {};
    usuarios.forEach(u => {
        brokerGroupMap[u.id] = u.id_grupo;
    });

    const { data: clientsData } = await supabase.from('clients').select('id, legacy_group_id, name');
    const clientMap = {};
    const clientNameMap = {};
    clientsData?.forEach(c => {
        if (c.legacy_group_id) {
            clientMap[c.legacy_group_id] = c.id;
            clientNameMap[c.legacy_group_id] = c.name;
        }
    });

    const { data: photoData } = await supabase.from('photographers').select('id, legacy_id, name');
    const photoMap = {};
    const photoNameMap = {};
    photoData?.forEach(p => {
        if (p.legacy_id) {
            photoMap[p.legacy_id] = p.id;
            photoNameMap[p.legacy_id] = p.name;
        }
    });

    // Fetch a default service ID
    const { data: defaultService } = await supabase.from('services').select('id').limit(1).single();
    const defaultServiceId = defaultService?.id;

    const statusMap = {
        '1': 'Confirmado',
        '2': 'Confirmado',      // Old: Em Andamento -> New: Confirmado (Active)
        '3': 'Concluído',       // Old: Concluido -> New: Concluído
        '4': 'Cancelado',       // Old: Cancelado -> New: Cancelado
        '5': 'Realizado',       // Old: Em Edição -> New: Realizado (Post-shoot)
        '6': 'Pendente',        // Old: Pendências -> New: Pendente
        '7': 'Realizado',       // Old: Realizado -> New: Realizado (Per user table)
        '8': 'Rascunho'         // Old: Pré-agendamento -> New: Rascunho
    };

    // Service Mapping Logic
    const mapServiceIds = (serviceName) => {
        if (!serviceName) return ['foto_profissional'];
        const lower = serviceName.toLowerCase();

        if (lower.includes('video') || lower.includes('vídeo')) return ['foto_profissional', 'video_profissional']; // Placeholder ID for video
        if (lower.includes('drone') || lower.includes('aerea') || lower.includes('aérea')) return ['foto_profissional', 'drone_profissional']; // Placeholder ID for drone

        return ['foto_profissional'];
    };

    // 3. Find a valid candidate
    console.log('🔍 Looking for a valid candidate...');
    let candidate = null;
    let candidateReport = null;
    let candidateClientId = null;
    let candidatePhotoId = null;

    for (const servico of servicos) {
        const brokerId = servico.id_corretor;
        const groupId = brokerGroupMap[brokerId];
        const clientId = clientMap[groupId];
        const photographerId = photoMap[servico.id_fotografo];
        const report = reportMap[servico.id];

        // We want a service that has BOTH client and photographer mapped for a perfect test
        // And preferably one that isn't already migrated
        // And HAS a report entry for better data
        if (clientId && photographerId && report) {
            candidate = servico;
            candidateReport = report;
            candidateClientId = clientId;
            candidatePhotoId = photographerId;
            break;
        }
    }

    if (!candidate) {
        console.log('❌ No valid candidate found (or all already migrated).');
        return;
    }

    console.log(`✅ Candidate Found! Legacy ID: ${candidate.id}`);
    console.log(`   Client: ${clientNameMap[brokerGroupMap[candidate.id_corretor]]} (ID: ${candidateClientId})`);
    console.log(`   Photographer: ${photoNameMap[candidate.id_fotografo]} (ID: ${candidatePhotoId})`);
    console.log(`   Service Name (Report): ${candidateReport.servicos}`);
    console.log(`   Price (Report): ${candidateReport.valor}`);

    // 4. Prepare Data
    const endereco = enderecos.find(e => e.id === candidate.id_endereco);
    const fullAddress = endereco
        ? `${endereco.logradouro}, ${candidate.numero_predial} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}`
        : 'Endereço não encontrado';

    // Parse price from report (e.g. "150,00" -> 150.00)
    const priceStr = candidateReport.valor || '0';
    const price = parseFloat(priceStr.replace(',', '.'));

    const payoutStr = candidateReport.Fornecedor || '0';
    const payout = parseFloat(payoutStr.replace(',', '.'));

    const dropboxLink = candidate.drop_imagens !== '\\N' ? candidate.drop_imagens : null;
    const startTime = candidate.hora_prevista !== '\\N' ? candidate.hora_prevista.substring(0, 5) : '00:00';

    const bookingData = {
        client_id: candidateClientId,
        photographer_id: candidatePhotoId,
        date: parseDate(candidate.data_prevista, candidate.hora_prevista),
        start_time: startTime,
        status: statusMap[candidate.status] || 'Pendente',
        address: fullAddress,
        google_drive_folder_link: dropboxLink,
        total_price: price,
        legacy_id: parseInt(candidate.id),
        notes: candidate.obs !== '\\N' ? candidate.obs : null,
        is_accompanied: candidate.acompanhamento === '1',
        // client_name and client_phone removed as they are not in the bookings table
        service_ids: mapServiceIds(candidateReport.servicos), // Dynamic mapping
        created_at: candidate.data_hora_cadastro !== '\\N' ? candidate.data_hora_cadastro : new Date().toISOString(),
        photographer_payout: payout,
        is_paid_to_photographer: false,
        internal_notes: `Serviço Original: ${candidateReport.servicos}` // Store original service name here
    };

    console.log('\n📝 Payload to Insert:', JSON.stringify(bookingData, null, 2));

    // 5. Insert
    const { data, error } = await supabase.from('bookings').insert([bookingData]).select();

    if (error) {
        console.error('❌ Error inserting:', error);
    } else {
        console.log(`\n🎉 Success! Inserted Booking ID: ${data[0].id}`);
        console.log(`ℹ️ Status Mapping: Original '${candidate.status}' -> Mapped '${bookingData.status}'`);
    }
}

migrateSingleServiceTest().catch(console.error);
