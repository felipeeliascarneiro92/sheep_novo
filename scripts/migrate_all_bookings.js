
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

// Helper to read CSV
function readCSV(filePath) {
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

async function migrateAllBookings() {
    console.log('🚀 Starting MASS Migration of Bookings (Optimized)...');

    // 1. Load CSVs
    console.log('📂 Loading CSVs into memory...');
    const servicos = readCSV(path.join(csvDir, 'servicos.csv'));
    const servicosItens = readCSV(path.join(csvDir, 'servicos_itens.csv'));
    const usuarios = readCSV(path.join(csvDir, 'usuario.csv'));
    const enderecos = readCSV(path.join(csvDir, 'endereco.csv'));

    console.log(`   - Services: ${servicos.length}`);
    console.log(`   - Items: ${servicosItens.length}`);

    // Load Report for payout info
    const reportPath = path.join(csvDir, 'relatorio_agendamentos.csv');
    let reportMap = {};
    if (fs.existsSync(reportPath)) {
        const reportContent = fs.readFileSync(reportPath, 'utf-8');
        const reportRecords = parse(reportContent, {
            columns: true,
            skip_empty_lines: true,
            delimiter: ',',
            relax_quotes: true
        });
        reportRecords.forEach(r => { reportMap[r.Id] = r; });
    }

    // 2. Build In-Memory Maps for CSV Data
    console.log('🗺️ Building CSV Maps...');

    const brokerGroupMap = {};
    usuarios.forEach(u => { brokerGroupMap[u.id] = u.id_grupo; });

    const addressMap = {};
    enderecos.forEach(a => { addressMap[a.id] = a; });

    // Group Items by Service ID for faster lookup
    const itemsByServiceId = {};
    servicosItens.forEach(i => {
        if (!itemsByServiceId[i.id_servico]) itemsByServiceId[i.id_servico] = [];
        itemsByServiceId[i.id_servico].push(i);
    });

    // 3. Fetch DB Maps
    console.log('📡 Fetching DB Maps...');

    // Clients
    let clientMap = {}; // legacy_group_id -> uuid
    {
        let page = 0;
        while (true) {
            const { data, error } = await supabase.from('clients').select('id, legacy_group_id').range(page * 1000, (page + 1) * 1000 - 1);
            if (error || !data || data.length === 0) break;
            data.forEach(c => { if (c.legacy_group_id) clientMap[c.legacy_group_id] = c.id; });
            page++;
        }
    }
    console.log(`   - Clients Mapped: ${Object.keys(clientMap).length}`);

    // Photographers
    let photoMap = {}; // legacy_id -> uuid
    {
        const { data } = await supabase.from('photographers').select('id, legacy_id');
        data?.forEach(p => { if (p.legacy_id) photoMap[p.legacy_id] = p.id; });
    }

    // Brokers
    let brokerMap = {}; // legacy_id -> uuid
    {
        let page = 0;
        while (true) {
            const { data, error } = await supabase.from('brokers').select('id, legacy_id').range(page * 1000, (page + 1) * 1000 - 1);
            if (error || !data || data.length === 0) break;
            data.forEach(b => { if (b.legacy_id) brokerMap[b.legacy_id] = b.id; });
            page++;
        }
    }

    // Services
    let serviceLegacyMap = {}; // legacy_id -> uuid
    {
        const { data } = await supabase.from('services').select('id, legacy_id');
        data?.forEach(s => { if (s.legacy_id) serviceLegacyMap[s.legacy_id] = s.id; });
    }

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

    // 4. Processing Loop (with immediate batch execution)
    console.log('🔄 Processing Bookings with Streamlined Batching...');

    let toInsert = [];
    let toUpdate = [];
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    const BATCH_SIZE = 100;

    // Fetch existing bookings map first
    console.log('⚖️ Fetching existing bookings...');
    const existingBookingsMap = {};
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('bookings').select('id, legacy_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        data.forEach(b => { if (b.legacy_id) existingBookingsMap[b.legacy_id] = b.id; });
        page++;
    }
    console.log(`   - Found ${Object.keys(existingBookingsMap).length} existing bookings in DB.`);

    for (const servico of servicos) {
        let status = statusMap[servico.status] || 'Pendente';
        if (servico.excluido === '1') status = 'Cancelado';

        const brokerLegacyId = servico.id_corretor;
        const groupId = brokerGroupMap[brokerLegacyId];
        const clientId = clientMap[groupId];
        const photographerId = photoMap[servico.id_fotografo];
        const brokerId = brokerMap[brokerLegacyId];

        if (!clientId) {
            skippedCount++;
            continue;
        }

        const items = itemsByServiceId[servico.id] || [];
        const endereco = addressMap[servico.id_endereco];
        const street = endereco ? endereco.logradouro : 'Endereço não encontrado';
        const neighborhood = endereco ? endereco.bairro : '';
        const city = endereco ? endereco.cidade : '';
        const state = endereco ? endereco.uf : '';

        let number = servico.numero_predial;
        if (!number || number === '\\N' || number.trim() === '') {
            number = endereco && endereco.numero && endereco.numero !== '\\N' ? endereco.numero : 'S/N';
        }

        const fullAddress = `${street}, ${number} - ${neighborhood}, ${city} - ${state}`;

        let totalPrice = 0;
        const serviceIds = [];
        const overrides = {};

        items.forEach(i => {
            const val = parseFloat(i.valor.replace(',', '.'));
            totalPrice += val;
            const sId = serviceLegacyMap[i.id_tipo_servico];
            if (sId) {
                serviceIds.push(sId);
                overrides[sId] = val;
            }
        });

        const report = reportMap[servico.id];
        const payout = report ? parseFloat(report.Fornecedor.replace(',', '.') || '0') : 0;
        const dropboxLink = servico.drop_imagens !== '\\N' ? servico.drop_imagens : null;
        const startTime = servico.hora_prevista !== '\\N' ? servico.hora_prevista.substring(0, 5) : '00:00';
        const obs = servico.obs !== '\\N' ? servico.obs : null;

        const bookingData = {
            legacy_id: parseInt(servico.id),
            client_id: clientId,
            photographer_id: photographerId || null,
            broker_id: brokerId || null,
            date: parseDate(servico.data_prevista, servico.hora_prevista),
            start_time: startTime,
            status: status,
            address: fullAddress,
            google_drive_folder_link: dropboxLink,
            total_price: totalPrice,
            unit_details: obs,
            notes: null,
            is_accompanied: servico.acompanhamento === '1',
            service_ids: serviceIds,
            service_price_overrides: overrides,
            created_at: servico.data_hora_cadastro !== '\\N' ? servico.data_hora_cadastro : new Date().toISOString(),
            photographer_payout: payout,
            is_paid_to_photographer: false,
            internal_notes: report ? `Serviço Original: ${report.servicos}` : 'Migrado via Itens'
        };

        const existingId = existingBookingsMap[bookingData.legacy_id];
        if (existingId) {
            toUpdate.push({ ...bookingData, id: existingId });
        } else {
            toInsert.push(bookingData);
        }

        // Execute Batches
        if (toInsert.length >= BATCH_SIZE) {
            const { error } = await supabase.from('bookings').insert(toInsert);
            if (error) {
                console.error(`❌ Error inserting batch: ${error.message}`);
                failCount += toInsert.length;
            } else {
                successCount += toInsert.length;
                process.stdout.write('I'); // I for Insert
            }
            toInsert = [];
        }

        if (toUpdate.length >= BATCH_SIZE) {
            const { error } = await supabase.from('bookings').upsert(toUpdate);
            if (error) {
                console.error(`❌ Error updating batch: ${error.message}`);
                failCount += toUpdate.length;
            } else {
                successCount += toUpdate.length;
                process.stdout.write('U'); // U for Update
            }
            toUpdate = [];
        }
    }

    // Flush remaining
    if (toInsert.length > 0) {
        const { error } = await supabase.from('bookings').insert(toInsert);
        if (error) {
            console.error(`❌ Error inserting final batch: ${error.message}`);
            failCount += toInsert.length;
        } else {
            successCount += toInsert.length;
        }
    }

    if (toUpdate.length > 0) {
        const { error } = await supabase.from('bookings').upsert(toUpdate);
        if (error) {
            console.error(`❌ Error updating final batch: ${error.message}`);
            failCount += toUpdate.length;
        } else {
            successCount += toUpdate.length;
        }
    }

    console.log(`\n🎉 Migration Finished!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Skipped: ${skippedCount}`);
}

migrateAllBookings().catch(console.error);
