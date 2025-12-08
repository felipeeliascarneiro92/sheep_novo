
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

async function updateBrokersPhones() {
    console.log('🚀 Starting Broker Phone Update...');

    // 1. Load CSVs
    console.log('Reading CSV files...');
    const usuarioContent = fs.readFileSync(path.join(csvDir, 'usuario.csv'), 'utf-8');
    const usuarios = parse(usuarioContent, { columns: true, skip_empty_lines: true, delimiter: ';', relax_quotes: true });

    const enderecosContent = fs.readFileSync(path.join(csvDir, 'endereco.csv'), 'utf-8');
    const enderecos = parse(enderecosContent, { columns: true, skip_empty_lines: true, delimiter: ';', relax_quotes: true });

    // Index addresses
    const addressById = {};
    enderecos.forEach(a => {
        addressById[a.id] = a;
    });

    console.log(`Loaded ${usuarios.length} users and ${enderecos.length} addresses.`);

    // 2. Prepare Updates
    const updates = [];
    let skipped = 0;

    for (const user of usuarios) {
        if (!user.id_endereco || user.id_endereco === '\\N') {
            skipped++;
            continue;
        }

        const address = addressById[user.id_endereco];
        if (!address) continue;

        let phone = null;

        // Priority: Celular -> Telefone -> Comercial
        if (address.celular && address.celular !== '\\N') {
            phone = address.celular;
        } else if (address.telefone && address.telefone !== '\\N') {
            phone = address.telefone;
        } else if (address.comercial && address.comercial !== '\\N') {
            phone = address.comercial;
        }

        if (phone) {
            updates.push({
                legacy_id: parseInt(user.id),
                phone: phone
            });
        }
    }

    console.log(`Found phones for ${updates.length} brokers.`);

    // 3. Update in Supabase
    // We need to fetch Supabase IDs first because we can't update by legacy_id easily without upserting everything
    // Actually, we can use upsert if we have the PK. But we don't have the PK (UUID) in the update list yet.
    // So let's fetch all brokers first.

    let dbBrokers = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('brokers').select('id, legacy_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        dbBrokers = dbBrokers.concat(data);
        page++;
    }

    const brokerMap = {}; // legacy_id -> uuid
    dbBrokers.forEach(b => {
        if (b.legacy_id) brokerMap[b.legacy_id] = b.id;
    });

    // 4. Execute Updates
    console.log('Updating Supabase...');
    let updatedCount = 0;

    // We can use a loop to update. For 3000 records it's fine.
    // Or we can construct a bulk upsert if we include all required fields? No, too risky.
    // Let's do manual updates in parallel batches.

    const BATCH_SIZE = 50;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (u) => {
            const uuid = brokerMap[u.legacy_id];
            if (uuid) {
                const { error } = await supabase.from('brokers').update({ phone: u.phone }).eq('id', uuid);
                if (!error) return 1;
            }
            return 0;
        });

        const results = await Promise.all(promises);
        updatedCount += results.reduce((a, b) => a + b, 0);

        if (i % 500 === 0) console.log(`Processed ${i} / ${updates.length}`);
    }

    console.log(`✅ Updated phones for ${updatedCount} brokers.`);
}

updateBrokersPhones();
