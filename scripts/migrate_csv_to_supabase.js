import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const csvDir = path.join(__dirname, '../csv_antigos');

// Helper to read CSV
async function readCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true,
    });
}

// Helper to parse dates (YYYY-MM-DD HH:mm:ss or YYYY-MM-DD)
function parseDate(dateStr, timeStr = '00:00:00') {
    if (!dateStr || dateStr === '\\N') return null;
    const datePart = dateStr.split(' ')[0];
    return `${datePart}T${timeStr}`;
}

async function migrate() {
    console.log('Starting migration...');

    // 1. Read CSVs
    console.log('Reading CSV files...');
    const clientes = await readCSV(path.join(csvDir, 'clientes.csv'));
    const usuarios = await readCSV(path.join(csvDir, 'usuario.csv'));
    const servicos = await readCSV(path.join(csvDir, 'servicos.csv'));
    const enderecos = await readCSV(path.join(csvDir, 'endereco.csv'));

    // 2. Migrate Photographers (Users with type 2)
    console.log('Migrating Photographers...');
    const photographerMap = {}; // legacy_id -> uuid
    const photographers = usuarios.filter(u => u.id_usuario_tipo === '2');

    for (const p of photographers) {
        const { data: existing } = await supabase
            .from('photographers')
            .select('id')
            .eq('email', p.email)
            .single();

        if (existing) {
            photographerMap[p.id] = existing.id;
            // console.log(`Photographer exists: ${p.nome}`);
        } else {
            const { data: newPhoto, error: insertError } = await supabase
                .from('photographers')
                .insert({
                    name: p.nome,
                    email: p.email,
                    phone: p.celular_validador && p.celular_validador !== '\\N' ? p.celular_validador : null,
                })
                .select()
                .single();

            if (insertError) {
                console.error(`Error creating photographer ${p.nome}:`, insertError.message);
            } else {
                photographerMap[p.id] = newPhoto.id;
                console.log(`Migrated photographer: ${p.nome}`);
            }
        }
    }

    // 3. Migrate Clients (Existing logic + Map)
    console.log('Mapping Clients...');
    const clientMap = {}; // legacy_group_id -> uuid
    const { data: existingClients } = await supabase.from('clients').select('id, legacy_group_id');
    existingClients?.forEach(c => {
        if (c.legacy_group_id) clientMap[c.legacy_group_id] = c.id;
    });

    // 4. Migrate Services
    console.log('Migrating Services (Bookings)...');

    const userGroupMap = {};
    usuarios.forEach(u => {
        userGroupMap[u.id] = u.id_grupo;
    });
    console.log(`User Group Map Size: ${Object.keys(userGroupMap).length}`);

    const statusMap = {
        '1': 'Confirmado',
        '2': 'Em Andamento',
        '3': 'Realizado',
        '4': 'Concluído',
        '5': 'Cancelado',
    };

    let servicesMigrated = 0;
    const MAX_SERVICES = 18;

    console.log(`Total Services in CSV: ${servicos.length}`);
    console.log(`Client Map Size: ${Object.keys(clientMap).length}`);

    for (const servico of servicos) {
        if (servicesMigrated >= MAX_SERVICES) break;

        const brokerLegacyId = servico.id_corretor;
        const groupLegacyId = userGroupMap[brokerLegacyId];

        if (!groupLegacyId) {
            // console.warn(`Could not find group for broker ${brokerLegacyId} in service ${servico.id}`);
            continue;
        }

        const clientId = clientMap[groupLegacyId];
        if (!clientId) {
            // console.log(`Client not found for group ${groupLegacyId} (Service ${servico.id})`);
            continue;
        }

        const { data: existingBooking } = await supabase
            .from('bookings')
            .select('id')
            .eq('legacy_id', servico.id)
            .single();

        if (existingBooking) {
            console.log(`Service ${servico.id} already exists. Skipping.`);
            continue;
        }

        const photographerId = photographerMap[servico.id_fotografo];

        const endereco = enderecos.find(e => e.id === servico.id_endereco);
        const fullAddress = endereco ? `${endereco.logradouro}, ${servico.numero_predial} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}` : 'Endereço não encontrado';

        const status = statusMap[servico.status] || 'Pendente';
        const date = parseDate(servico.data_prevista, servico.hora_prevista);
        const dropboxLink = servico.drop_imagens !== '\\N' ? servico.drop_imagens : null;
        const price = 150.00;

        const bookingData = {
            client_id: clientId,
            photographer_id: photographerId || null,
            date: date,
            status: status,
            address: fullAddress,
            dropbox_folder_link: dropboxLink,
            total_price: price,
            legacy_id: parseInt(servico.id),
            notes: servico.obs !== '\\N' ? servico.obs : null,
            lat: 0,
            lng: 0,
            service_ids: [],
            client_name: 'Migrated Client',
            client_phone: '',
            is_accompanied: servico.acompanhamento === '1',
            isPaidToPhotographer: false,
            photographerPayout: price * 0.6,
            created_at: servico.data_hora_cadastro !== '\\N' ? servico.data_hora_cadastro : new Date().toISOString(),
        };

        const { error } = await supabase.from('bookings').insert(bookingData);

        if (error) {
            console.error(`Error migrating service ${servico.id}:`, error.message);
        } else {
            console.log(`Migrated service ${servico.id}`);
            servicesMigrated++;
        }
    }

    console.log(`Migration complete. Migrated ${servicesMigrated} services.`);
}

migrate().catch(console.error);
