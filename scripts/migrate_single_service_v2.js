
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

async function migrateSingleServiceV2() {
    console.log('🧪 Starting Single Service Migration Test V2 (Using Items)...');

    // 1. Load Data
    console.log('📂 Loading CSVs...');
    const servicos = await readCSV(path.join(csvDir, 'servicos.csv'));
    const servicosItens = await readCSV(path.join(csvDir, 'servicos_itens.csv'));
    const usuarios = await readCSV(path.join(csvDir, 'usuario.csv'));
    const enderecos = await readCSV(path.join(csvDir, 'endereco.csv'));

    // Load Report for better data (optional, but good for cross-check)
    const reportPath = path.join(csvDir, 'relatorio_agendamentos.csv');
    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    const reportRecords = parse(reportContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        relax_quotes: true
    });
    const reportMap = {};
    reportRecords.forEach(r => { reportMap[r.Id] = r; });

    // 2. Build Maps
    console.log('🗺️ Building Maps...');

    // Broker -> Group
    const brokerGroupMap = {};
    usuarios.forEach(u => { brokerGroupMap[u.id] = u.id_grupo; });

    // Client Map
    const { data: clientsData } = await supabase.from('clients').select('id, legacy_group_id, name');
    const clientMap = {};
    clientsData?.forEach(c => { if (c.legacy_group_id) clientMap[c.legacy_group_id] = c.id; });

    // Photographer Map
    const { data: photoData } = await supabase.from('photographers').select('id, legacy_id, name');
    const photoMap = {};
    photoData?.forEach(p => { if (p.legacy_id) photoMap[p.legacy_id] = p.id; });

    // Service Map (Legacy ID -> Supabase ID)
    const { data: servicesData } = await supabase.from('services').select('id, legacy_id');
    const serviceLegacyMap = {};
    servicesData?.forEach(s => {
        if (s.legacy_id) {
            serviceLegacyMap[s.legacy_id] = s.id;
        }
    });

    console.log('Service Legacy Map (Loaded from DB):', serviceLegacyMap);

    const statusMap = {
        '1': 'Confirmado',
        '2': 'Confirmado',
        '3': 'Concluído',
        '4': 'Cancelado',
        '5': 'Realizado',
        '6': 'Pendente',
        '7': 'Realizado',
        '8': 'Rascunho'
    };

    // 3. Find a valid candidate
    console.log('🔍 Looking for a valid candidate...');
    let candidate = null;
    let candidateItems = [];
    let candidateClientId = null;
    let candidatePhotoId = null;

    for (const servico of servicos) {
        const brokerId = servico.id_corretor;
        const groupId = brokerGroupMap[brokerId];
        const clientId = clientMap[groupId];
        const photographerId = photoMap[servico.id_fotografo];

        if (clientId && photographerId) {
            // Find items for this service
            const items = servicosItens.filter(i => i.id_servico === servico.id);

            if (items.length > 0) {
                // Check if we can map all items
                const allMapped = items.every(i => serviceLegacyMap[i.id_tipo_servico]);

                if (allMapped) {
                    candidate = servico;
                    candidateItems = items;
                    candidateClientId = clientId;
                    candidatePhotoId = photographerId;
                    break;
                }
            }
        }
    }

    if (!candidate) {
        console.log('❌ No valid candidate found (with mapped items).');
        return;
    }

    console.log(`✅ Candidate Found! Legacy ID: ${candidate.id}`);
    console.log(`   Items Found: ${candidateItems.length}`);
    candidateItems.forEach(i => {
        console.log(`   - Item Type: ${i.id_tipo_servico} -> Mapped to: ${serviceLegacyMap[i.id_tipo_servico]}`);
    });

    // 4. Prepare Data
    const endereco = enderecos.find(e => e.id === candidate.id_endereco);
    const fullAddress = endereco
        ? `${endereco.logradouro}, ${candidate.numero_predial} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}`
        : 'Endereço não encontrado';

    // Calculate Price from Items
    let totalPrice = 0;
    candidateItems.forEach(i => {
        const val = parseFloat(i.valor.replace(',', '.'));
        totalPrice += val;
    });

    // Get Payout from Report if available, otherwise guess?
    // Actually, let's use the report for Payout if available, or 0.
    const report = reportMap[candidate.id];
    const payout = report ? parseFloat(report.Fornecedor.replace(',', '.') || '0') : 0;

    const dropboxLink = candidate.drop_imagens !== '\\N' ? candidate.drop_imagens : null;
    const startTime = candidate.hora_prevista !== '\\N' ? candidate.hora_prevista.substring(0, 5) : '00:00';

    const serviceIds = candidateItems.map(i => serviceLegacyMap[i.id_tipo_servico]);

    const bookingData = {
        client_id: candidateClientId,
        photographer_id: candidatePhotoId,
        date: parseDate(candidate.data_prevista, candidate.hora_prevista),
        start_time: startTime,
        status: statusMap[candidate.status] || 'Pendente',
        address: fullAddress,
        google_drive_folder_link: dropboxLink,
        total_price: totalPrice,
        legacy_id: parseInt(candidate.id),
        notes: candidate.obs !== '\\N' ? candidate.obs : null,
        is_accompanied: candidate.acompanhamento === '1',
        service_ids: serviceIds,
        created_at: candidate.data_hora_cadastro !== '\\N' ? candidate.data_hora_cadastro : new Date().toISOString(),
        photographer_payout: payout,
        is_paid_to_photographer: false,
        internal_notes: report ? `Serviço Original: ${report.servicos}` : 'Migrado via Itens'
    };

    console.log('\n📝 Payload to Insert:', JSON.stringify(bookingData, null, 2));

    // 5. Insert
    const { data, error } = await supabase.from('bookings').insert([bookingData]).select();

    if (error) {
        console.error('❌ Error inserting:', error);
    } else {
        console.log(`\n🎉 Success! Inserted Booking ID: ${data[0].id}`);
    }
}

migrateSingleServiceV2().catch(console.error);
