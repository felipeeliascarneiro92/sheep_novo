
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

const csvPath = path.join(__dirname, '../csv_antigos/usuario.csv');

async function migrateAllBrokers() {
    console.log('🚀 Starting Bulk Broker Migration...');

    // 1. Load CSV
    const content = fs.readFileSync(csvPath, 'utf-8');
    const csvBrokers = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    // 2. Load Clients (Agencies) Map for linking
    // We need to map legacy_group_id -> client_id
    const { data: clients } = await supabase.from('clients').select('id, legacy_group_id');
    const clientMap = {};
    clients?.forEach(c => {
        if (c.legacy_group_id) clientMap[c.legacy_group_id] = c.id;
    });

    console.log(`Loaded ${Object.keys(clientMap).length} clients for linking.`);

    // 3. Prepare Data
    const brokersToUpsert = [];
    const skipped = [];

    for (const record of csvBrokers) {
        const clientId = clientMap[record.id_grupo];

        if (!clientId) {
            skipped.push({ id: record.id, name: record.nome, reason: `Client Group ${record.id_grupo} not found` });
            continue;
        }

        brokersToUpsert.push({
            legacy_id: parseInt(record.id),
            name: record.nome,
            email: record.email,
            phone: record.celular || record.telefone,
            client_id: clientId,
            is_active: record.ativo === '1',
            has_login: true, // Defaulting to true for migrated users
            permissions: { canSchedule: true, canViewAllBookings: false }
        });
    }

    console.log(`Ready to upsert ${brokersToUpsert.length} brokers. Skipped ${skipped.length}.`);

    // 4. Upsert in Batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < brokersToUpsert.length; i += BATCH_SIZE) {
        const batch = brokersToUpsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('brokers').upsert(batch, { onConflict: 'legacy_id' });

        if (error) {
            console.error(`Error upserting batch ${i}:`, error);
        } else {
            console.log(`Processed batch ${i} - ${i + batch.length}`);
        }
    }

    console.log('✅ Migration Complete.');
    if (skipped.length > 0) {
        console.log('⚠️ Skipped Brokers (Sample):', skipped.slice(0, 5));
    }
}

migrateAllBrokers();
