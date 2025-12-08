
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

async function migrateSingleBookingTest() {
    console.log('🛠️ Starting Single Booking Migration Test...');

    // 1. Load Data
    console.log('📂 Loading CSVs...');
    const servicos = await readCSV(path.join(csvDir, 'servicos.csv'));
    const servicosItens = await readCSV(path.join(csvDir, 'servicos_itens.csv'));
    const usuarios = await readCSV(path.join(csvDir, 'usuario.csv'));
    const enderecos = await readCSV(path.join(csvDir, 'endereco.csv'));

    // Load Report for payout info
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
    const { data: clientsData } = await supabase.from('clients').select('id, legacy_group_id');
    const clientMap = {};
    clientsData?.forEach(c => {
        if (c.legacy_group_id) clientMap[c.legacy_group_id] = c.id;
    });

    // Photographer Map
    const { data: photoData } = await supabase.from('photographers').select('id, legacy_id');
    const photoMap = {};
    photoData?.forEach(p => {
        if (p.legacy_id) photoMap[p.legacy_id] = p.id;
    });

    // Broker Map (Legacy ID -> UUID)
    const { data: brokersData } = await supabase.from('brokers').select('id, legacy_id');
    const brokerMap = {};
    brokersData?.forEach(b => {
        if (b.legacy_id) brokerMap[b.legacy_id] = b.id;
    });

    // Service Map (Legacy ID -> Supabase ID)
    const { data: servicesData } = await supabase.from('services').select('id, legacy_id');
    const serviceLegacyMap = {};
    servicesData?.forEach(s => {
        if (s.legacy_id) serviceLegacyMap[s.legacy_id] = s.id;
    });

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

    // 3. Select a recent booking to test (e.g., one before 47452)
    // Let's find 47451
    const targetId = '47451';
    const servico = servicos.find(s => s.id === targetId);

    if (!servico) {
        console.error(`❌ Service ${targetId} not found in CSV!`);
        return;
    }

    console.log(`Processing Booking ID: ${targetId}`);

    const brokerLegacyId = servico.id_corretor;
    const groupId = brokerGroupMap[brokerLegacyId];
    const clientId = clientMap[groupId];
    const photographerId = photoMap[servico.id_fotografo];
    const brokerId = brokerMap[brokerLegacyId];

    if (!clientId) { console.error('❌ Client not found'); return; }
    if (!photographerId) { console.error('❌ Photographer not found'); return; }
    if (!brokerId) { console.warn('⚠️ Broker not found (will proceed without linking broker)'); }

    const items = servicosItens.filter(i => i.id_servico === servico.id);
    console.log(`Found ${items.length} items for this booking.`);

    // Address Logic
    const endereco = enderecos.find(e => e.id === servico.id_endereco);
    const street = endereco ? endereco.logradouro : 'Endereço não encontrado';
    const neighborhood = endereco ? endereco.bairro : '';
    const city = endereco ? endereco.cidade : '';
    const state = endereco ? endereco.uf : '';

    let number = servico.numero_predial;
    if (!number || number === '\\N' || number.trim() === '') {
        number = endereco && endereco.numero && endereco.numero !== '\\N' ? endereco.numero : 'S/N';
    }

    const fullAddress = `${street}, ${number} - ${neighborhood}, ${city} - ${state}`;

    // Calculate Price & Overrides
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
        client_id: clientId,
        photographer_id: photographerId,
        broker_id: brokerId || null, // Link Broker
        date: parseDate(servico.data_prevista, servico.hora_prevista),
        start_time: startTime,
        status: statusMap[servico.status] || 'Pendente',
        address: fullAddress,
        google_drive_folder_link: dropboxLink,
        total_price: totalPrice,
        legacy_id: parseInt(servico.id),
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

    console.log('   Payload:', JSON.stringify(bookingData, null, 2));

    // Check if exists
    const { data: existing } = await supabase.from('bookings').select('id').eq('legacy_id', bookingData.legacy_id).maybeSingle();

    if (existing) {
        console.log('   Booking already exists, updating...');
        const { error } = await supabase.from('bookings').update(bookingData).eq('id', existing.id);
        if (error) console.error('   ❌ Error updating:', error);
        else console.log(`   🎉 Success! Updated Booking ID: ${existing.id}`);
    } else {
        console.log('   Inserting new booking...');
        const { data, error } = await supabase.from('bookings').insert([bookingData]).select();
        if (error) console.error('   ❌ Error inserting:', error);
        else console.log(`   🎉 Success! Inserted Booking ID: ${data[0].id}`);
    }
}

migrateSingleBookingTest().catch(console.error);
