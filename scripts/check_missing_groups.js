
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

const csvPath = path.join(__dirname, '../csv_antigos/grupo.csv');

async function checkMissingGroups() {
    console.log('--- Checking for Missing Groups (Clients) ---');

    // 1. Load CSV
    const content = fs.readFileSync(csvPath, 'utf-8');
    const csvGroups = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    console.log(`Total Groups in CSV: ${csvGroups.length}`);

    // 2. Load Supabase Clients (with pagination)
    let dbClients = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('clients')
            .select('legacy_group_id')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching DB clients:', error);
            break;
        }

        if (data.length === 0) break;

        dbClients = dbClients.concat(data);
        page++;
    }

    const dbGroupIds = new Set(dbClients.map(c => c.legacy_group_id?.toString()));
    console.log(`Total Clients (Groups) in Supabase: ${dbClients.length}`);

    // 3. Compare
    const missing = csvGroups.filter(g => !dbGroupIds.has(g.id));

    console.log(`Missing Groups: ${missing.length}`);

    if (missing.length > 0) {
        console.log('First 5 missing groups:');
        missing.slice(0, 5).forEach(g => console.log(` - ${g.nome} (ID: ${g.id})`));
    }
}

checkMissingGroups();
