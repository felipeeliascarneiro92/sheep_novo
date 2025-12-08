
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

async function migrateRecentServicesTest() {
    console.log('🧪 Starting Recent Services Migration Test (Limit: 2)...');

    // 1. Load Data
    console.log('📂 Loading CSVs...');
    const servicos = await readCSV(path.join(csvDir, 'servicos.csv'));
    const servicosItens = await readCSV(path.join(csvDir, 'servicos_itens.csv'));
    const usuarios = await readCSV(path.join(csvDir, 'usuario.csv'));
    const enderecos = await readCSV(path.join(csvDir, 'endereco.csv'));

    // Load Report for better data
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

    // Sort servicos by ID descending (assuming higher ID is newer)
    // We could also sort by data_prevista, but ID is usually a good proxy for creation order in legacy systems
    servicos.sort((a, b) => parseInt(b.id) - parseInt(a.id));

    // 2. Build Maps
    console.log('🗺️ Building Maps...');

    // Broker -> Group
    const brokerGroupMap = {};
    usuarios.forEach(u => { brokerGroupMap[u.id] = u.id_grupo; });

    // Client Map
    const { data: clientsData } = await supabase.from('clients').select('id, legacy_group_id, name');
    const clientMap = {};
    const clientNameMap = {};
    clientsData?.forEach(c => {
        if (c.legacy_group_id) {
            clientMap[c.legacy_group_id] = c.id;
            clientNameMap[c.legacy_group_id] = c.name;
        }
    });

    // Photographer Map
    const { data: photoData } = await supabase.from('photographers').select('id, legacy_id, name');
    const photoMap = {};
    const photoNameMap = {};
    photoData?.forEach(p => {
        if (p.legacy_id) {
            photoMap[p.legacy_id] = p.id;
            photoNameMap[p.legacy_id] = p.name;
        }
    });

    // Service Map (Legacy ID -> Supabase ID)
    const { data: servicesData } = await supabase.from('services').select('id, legacy_id');
    const serviceLegacyMap = {};
    servicesData?.forEach(s => {
        if (s.legacy_id) {
            serviceLegacyMap[s.legacy_id] = s.id;
        }
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

    // 3. Find valid candidates
    console.log('🔍 Looking for valid candidates...');
    let importedCount = 0;
    const targetCount = 2;

    for (const servico of servicos) {
        if (importedCount >= targetCount) break;

        const brokerId = servico.id_corretor;
        const groupId = brokerGroupMap[brokerId];
        const clientId = clientMap[groupId];
        const photographerId = photoMap[servico.id_fotografo];

        // Check if already migrated
        const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('legacy_id', servico.id)
            .maybeSingle();

        if (existing) {
            // Skip already migrated
            continue;
        }

        if (clientId && photographerId) {
            // Find items for this service
            const items = servicosItens.filter(i => i.id_servico === servico.id);

            if (items.length > 0) {
                // Check if we can map all items
                const allMapped = items.every(i => serviceLegacyMap[i.id_tipo_servico]);

                if (allMapped) {
                    // Found a candidate!
                    console.log(`\n✅ Processing Candidate Legacy ID: ${servico.id}`);
                    console.log(`   Client: ${clientNameMap[groupId]}`);
                    console.log(`   Photographer: ${photoNameMap[servico.id_fotografo]}`);

                    // Prepare Data
                    const endereco = enderecos.find(e => e.id === servico.id_endereco);
                    const fullAddress = endereco
                        ? `${endereco.logradouro}, ${servico.numero_predial} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}`
                        : 'Endereço não encontrado';

                    // Calculate Price from Items
                    let totalPrice = 0;
                    items.forEach(i => {
                        const val = parseFloat(i.valor.replace(',', '.'));
                        totalPrice += val;
                    });

                    const report = reportMap[servico.id];
                    const payout = report ? parseFloat(report.Fornecedor.replace(',', '.') || '0') : 0;

                    const dropboxLink = servico.drop_imagens !== '\\N' ? servico.drop_imagens : null;
                    const startTime = servico.hora_prevista !== '\\N' ? servico.hora_prevista.substring(0, 5) : '00:00';

                    const serviceIds = items.map(i => serviceLegacyMap[i.id_tipo_servico]);

                    const bookingData = {
                        client_id: clientId,
                        photographer_id: photographerId,
                        date: parseDate(servico.data_prevista, servico.hora_prevista),
                        start_time: startTime,
                        status: statusMap[servico.status] || 'Pendente',
                        address: fullAddress,
                        google_drive_folder_link: dropboxLink,
                        total_price: totalPrice,
                        legacy_id: parseInt(servico.id),
                        notes: servico.obs !== '\\N' ? servico.obs : null,
                        is_accompanied: servico.acompanhamento === '1',
                        service_ids: serviceIds,
                        created_at: servico.data_hora_cadastro !== '\\N' ? servico.data_hora_cadastro : new Date().toISOString(),
                        photographer_payout: payout,
                        is_paid_to_photographer: false,
                        internal_notes: report ? `Serviço Original: ${report.servicos}` : 'Migrado via Itens'
                    };

                    console.log('   Payload:', JSON.stringify(bookingData, null, 2));

                    const { data, error } = await supabase.from('bookings').insert([bookingData]).select();

                    if (error) {
                        console.error('   ❌ Error inserting:', error);
                    } else {
                        console.log(`   🎉 Success! Inserted Booking ID: ${data[0].id}`);
                        importedCount++;
                    }
                } else {
                    // console.log(`   Skipping Legacy ID ${servico.id}: Unmapped items.`);
                }
            }
        }
    }

    console.log(`\n🏁 Finished. Imported ${importedCount} bookings.`);
}

migrateRecentServicesTest().catch(console.error);
