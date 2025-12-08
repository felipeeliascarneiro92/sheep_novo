
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

async function analyzeBrokersGap() {
    console.log('--- Analyzing Brokers Gap ---');

    // 1. Count CSV Records
    const usuarioContent = fs.readFileSync(path.join(csvDir, 'usuario.csv'), 'utf-8');
    const csvBrokers = parse(usuarioContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });
    console.log(`Total Brokers in CSV: ${csvBrokers.length}`);

    // 2. Count DB Records
    const { count, error } = await supabase.from('brokers').select('*', { count: 'exact', head: true });
    if (error) console.error('Error counting DB brokers:', error);
    else console.log(`Total Brokers in Supabase: ${count}`);

    // 3. Analyze Group IDs
    const grupoContent = fs.readFileSync(path.join(csvDir, 'grupo.csv'), 'utf-8');
    const csvGroups = parse(grupoContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });
    const validGroupIds = new Set(csvGroups.map(g => g.id));
    console.log(`Total Valid Groups in CSV: ${validGroupIds.size}`);

    const brokersWithInvalidGroup = csvBrokers.filter(b => !validGroupIds.has(b.id_grupo));
    console.log(`Brokers with Group ID NOT in grupo.csv: ${brokersWithInvalidGroup.length}`);

    if (brokersWithInvalidGroup.length > 0) {
        console.log('Sample invalid group IDs:', brokersWithInvalidGroup.slice(0, 5).map(b => b.id_grupo));
    }

    // 4. Check how many of the valid ones are missing in DB
    // Fetch all legacy_ids from brokers
    let dbBrokerLegacyIds = new Set();
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('brokers').select('legacy_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        data.forEach(b => dbBrokerLegacyIds.add(b.legacy_id?.toString()));
        page++;
    }

    const missingValidBrokers = csvBrokers.filter(b => validGroupIds.has(b.id_grupo) && !dbBrokerLegacyIds.has(b.id));
    console.log(`Brokers with VALID group but MISSING in DB: ${missingValidBrokers.length}`);
}

analyzeBrokersGap();
