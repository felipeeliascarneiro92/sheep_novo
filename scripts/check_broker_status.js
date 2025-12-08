
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

async function checkBrokerAndDb() {
    console.log('--- Checking Broker Data ---');

    // 1. Check CSV for Wesley (ID 2745)
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    const wesley = records.find(r => r.id === '2745');
    console.log('CSV Record for Wesley (2745):', wesley);

    if (!wesley) {
        console.error('Wesley not found in CSV!');
        return;
    }

    // 2. Check if Brokers table exists and has data
    const { data: brokers, error } = await supabase.from('brokers').select('*').limit(5);
    if (error) {
        console.error('Error fetching brokers:', error);
    } else {
        console.log(`Brokers in DB (Sample of ${brokers.length}):`, brokers);
    }

    // 3. Check if Client (Group) exists
    const groupId = wesley.id_grupo;
    console.log(`Checking for Client with Legacy Group ID: ${groupId}`);
    const { data: client } = await supabase.from('clients').select('id, name, legacy_group_id').eq('legacy_group_id', groupId).single();
    console.log('Client found:', client);
}

checkBrokerAndDb();
