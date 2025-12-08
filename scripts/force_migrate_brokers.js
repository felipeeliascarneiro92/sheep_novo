
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const csvDir = path.join(__dirname, '../csv_antigos');

async function forceMigrateBrokers() {
    console.log('🚀 Starting Force Migration of Brokers...');

    // 1. Load CSVs
    const usuarioContent = fs.readFileSync(path.join(csvDir, 'usuario.csv'), 'utf-8');
    const csvBrokers = parse(usuarioContent, { columns: true, skip_empty_lines: true, delimiter: ';', relax_quotes: true });

    // 2. Load Clients Map (Legacy Group ID -> Client ID)
    // We need to fetch ALL clients to ensure we have the mapping
    let clientMap = {};
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('clients').select('id, legacy_group_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        data.forEach(c => {
            if (c.legacy_group_id) clientMap[c.legacy_group_id] = c.id;
        });
        page++;
    }
    console.log(`Loaded ${Object.keys(clientMap).length} clients for linking.`);

    // 3. Prepare Upsert Data
    const brokersToUpsert = [];
    const skipped = [];

    for (const record of csvBrokers) {
        const clientId = clientMap[record.id_grupo];

        if (!clientId) {
            // If client not found, we can't link. 
            // But wait, if valid groups are missing in DB, we should have migrated them.
            // Let's log these to understand why.
            skipped.push({ id: record.id, group: record.id_grupo });
            continue;
        }

        brokersToUpsert.push({
            legacy_id: parseInt(record.id),
            name: record.nome,
            email: record.email,
            phone: record.celular || record.telefone,
            client_id: clientId,
            is_active: record.ativo === '1',
            has_login: true,
            permissions: { canSchedule: true, canViewAllBookings: false }
        });
    }

    console.log(`Prepared ${brokersToUpsert.length} brokers for upsert. Skipped ${skipped.length}.`);

    if (skipped.length > 0) {
        console.log('Sample skipped (Group not found in Clients table):', skipped.slice(0, 5));
    }

    // 4. Manual Upsert Loop
    console.log('Starting manual upsert loop...');
    let successCount = 0;
    let errorCount = 0;

    for (const broker of brokersToUpsert) {
        // Check if exists
        const { data: existing } = await supabase.from('brokers').select('id').eq('legacy_id', broker.legacy_id).maybeSingle();

        if (existing) {
            const { error } = await supabase.from('brokers').update(broker).eq('id', existing.id);
            if (error) {
                console.error(`Error updating broker ${broker.legacy_id}:`, error.message);
                errorCount++;
            } else {
                successCount++;
            }
        } else {
            const { error } = await supabase.from('brokers').insert([broker]);
            if (error) {
                console.error(`Error inserting broker ${broker.legacy_id}:`, error.message);
                errorCount++;
            } else {
                successCount++;
            }
        }

        if (successCount % 100 === 0) process.stdout.write('.');
    }
    console.log(`\nManual Upsert Complete. Success: ${successCount}, Errors: ${errorCount}`);

    console.log('✅ Force Migration Complete.');
}

forceMigrateBrokers();
