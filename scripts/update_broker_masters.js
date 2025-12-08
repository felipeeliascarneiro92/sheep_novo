
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

async function updateBrokerMasters() {
    console.log('🚀 Starting Broker Masters Update...');

    // 1. Load CSV
    console.log('Reading usuario.csv...');
    const usuarioContent = fs.readFileSync(path.join(csvDir, 'usuario.csv'), 'utf-8');
    const usuarios = parse(usuarioContent, { columns: true, skip_empty_lines: true, delimiter: ';', relax_quotes: true });

    // 2. Filter Masters
    const masters = usuarios.filter(u => u.master === '1');
    console.log(`Found ${masters.length} masters in CSV.`);

    // 3. Prepare Updates
    const masterLegacyIds = new Set(masters.map(m => parseInt(m.id)));

    // 4. Fetch Brokers from DB
    let dbBrokers = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('brokers').select('id, legacy_id, permissions').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        dbBrokers = dbBrokers.concat(data);
        page++;
    }

    console.log(`Fetched ${dbBrokers.length} brokers from DB.`);

    // 5. Identify Updates
    const updates = [];
    let checkedCount = 0;
    for (const broker of dbBrokers) {
        if (broker.legacy_id && masterLegacyIds.has(broker.legacy_id)) {
            checkedCount++;
            // Check if already has permission
            const currentPerms = broker.permissions || {};

            if (checkedCount === 1) {
                console.log('Sample Master Broker in DB:', broker);
            }

            if (!currentPerms.canViewAllBookings) {
                updates.push({
                    id: broker.id,
                    permissions: { ...currentPerms, canSchedule: true, canViewAllBookings: true }
                });
            }
        }
    }
    console.log(`Checked ${checkedCount} masters in DB.`);

    console.log(`Found ${updates.length} brokers needing permission update.`);

    // 6. Execute Updates
    let updatedCount = 0;
    const BATCH_SIZE = 50;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (u) => {
            const { error } = await supabase.from('brokers').update({ permissions: u.permissions }).eq('id', u.id);
            if (!error) return 1;
            return 0;
        });

        const results = await Promise.all(promises);
        updatedCount += results.reduce((a, b) => a + b, 0);

        if (i % 500 === 0) console.log(`Processed ${i} / ${updates.length}`);
    }

    console.log(`✅ Updated permissions for ${updatedCount} masters.`);
}

updateBrokerMasters();
