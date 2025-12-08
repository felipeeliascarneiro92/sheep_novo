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
        relax_quotes: true,
        to: 50 // LIMIT FOR DEBUG/PERFORMANCE
    });
}

function parseDate(dateStr, timeStr = '00:00:00') {
    if (!dateStr || dateStr === '\\N') return null;
    const datePart = dateStr.split(' ')[0];
    return `${datePart}T${timeStr}`;
}

async function migrateServices() {
    console.log('Starting Service Migration (Final v3)...');

    // 1. Load Data
    console.log('Loading CSVs...');
    const servicos = await readCSV(path.join(csvDir, 'servicos.csv'));
    const usuarios = await readCSV(path.join(csvDir, 'usuario.csv'));
    const enderecos = await readCSV(path.join(csvDir, 'endereco.csv'));

    // 2. Build Maps
    console.log('Building Maps...');

    const brokerGroupMap = {};
    usuarios.forEach(u => {
        brokerGroupMap[u.id] = u.id_grupo;
    });

    const { data: clientsData } = await supabase.from('clients').select('id, legacy_group_id');
    const clientMap = {};
    clientsData?.forEach(c => {
        if (c.legacy_group_id) clientMap[c.legacy_group_id] = c.id;
    });

    const { data: photoData } = await supabase.from('photographers').select('id, legacy_id');
    const photoMap = {};
    photoData?.forEach(p => {
        if (p.legacy_id) photoMap[p.legacy_id] = p.id;
    });

    // Fetch a default service ID to ensure list isn't empty
    const { data: defaultService } = await supabase.from('services').select('id').limit(1).single();
    const defaultServiceId = defaultService?.id;
    console.log(`Using default service ID: ${defaultServiceId}`);

    const statusMap = {
        '1': 'Confirmado',
        '2': 'Em Andamento',
        '3': 'Concluído', // Changed from Realizado
        '4': 'Concluído',
        '5': 'Cancelado',
    };

    let migratedCount = 0;
    const MAX_SERVICES = 18; // Production mode (limited)

    for (const servico of servicos) {
        if (migratedCount >= MAX_SERVICES) break;

        const brokerId = servico.id_corretor;
        const groupId = brokerGroupMap[brokerId];
        const clientId = clientMap[groupId];

        if (!clientId) {
            continue;
        }

        const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('legacy_id', servico.id)
            .maybeSingle();

        if (existing) {
            console.log(`Skipping Service ${servico.id}: Already exists`);
            continue;
        }

        const photographerId = photoMap[servico.id_fotografo] || null;

        const endereco = enderecos.find(e => e.id === servico.id_endereco);
        const fullAddress = endereco
            ? `${endereco.logradouro}, ${servico.numero_predial} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}`
            : 'Endereço não encontrado';

        const price = 150.00;
        const dropboxLink = servico.drop_imagens !== '\\N' ? servico.drop_imagens : null;
        const startTime = servico.hora_prevista !== '\\N' ? servico.hora_prevista.substring(0, 5) : '00:00';

        const bookingData = {
            client_id: clientId,
            photographer_id: photographerId,
            date: parseDate(servico.data_prevista, servico.hora_prevista),
            start_time: startTime,
            status: statusMap[servico.status] || 'Pendente',
            address: fullAddress,
            google_drive_folder_link: dropboxLink,
            total_price: price,
            legacy_id: parseInt(servico.id),
            notes: servico.obs !== '\\N' ? servico.obs : null,
            is_accompanied: servico.acompanhamento === '1',
            client_name: 'Migrated Client', // Placeholder
            client_phone: '',
            service_ids: defaultServiceId ? [defaultServiceId] : [],
            created_at: servico.data_hora_cadastro !== '\\N' ? servico.data_hora_cadastro : new Date().toISOString(),
            photographer_payout: price * 0.6,
            is_paid_to_photographer: false
        };

        console.log('Inserting:', JSON.stringify(bookingData, null, 2));

        const { error } = await supabase.from('bookings').insert(bookingData);

        if (error) {
            console.error(`Error migrating Service ${servico.id}:`, JSON.stringify(error, null, 2));
        } else {
            console.log(`Migrated Service ${servico.id} (Client: ${clientId}, Photo: ${photographerId})`);
            migratedCount++;
        }
    }
    console.log(`\nMigration Complete. Migrated ${migratedCount} services.`);
}

migrateServices().catch(console.error);
