
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

async function checkMissingBrokers() {
    console.log('--- Checking for Missing Brokers ---');

    // 1. Load CSV
    const content = fs.readFileSync(csvPath, 'utf-8');
    const csvBrokers = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    console.log(`Total Brokers in CSV: ${csvBrokers.length}`);

    // 2. Load Supabase Brokers
    // We need to fetch all to compare. Assuming < 1000 for now, or use pagination if needed.
    const { data: dbBrokers, error } = await supabase.from('brokers').select('legacy_id');

    if (error) {
        console.error('Error fetching DB brokers:', error);
        return;
    }

    const dbBrokerIds = new Set(dbBrokers.map(b => b.legacy_id?.toString()));
    console.log(`Total Brokers in Supabase: ${dbBrokers.length}`);

    // 3. Compare
    const missing = csvBrokers.filter(b => !dbBrokerIds.has(b.id));

    console.log(`Missing Brokers: ${missing.length}`);

    if (missing.length > 0) {
        console.log('First 5 missing brokers:');
        missing.slice(0, 5).forEach(b => console.log(` - ${b.nome} (ID: ${b.id}, Group: ${b.id_grupo})`));
    }
}

checkMissingBrokers();
