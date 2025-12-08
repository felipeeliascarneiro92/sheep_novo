
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

async function migrateMissingGroups() {
    console.log('🚀 Starting Missing Groups Migration...');

    // 1. Load CSV
    const content = fs.readFileSync(csvPath, 'utf-8');
    const csvGroups = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    console.log(`Total Groups in CSV: ${csvGroups.length}`);

    // 2. Load Existing Clients (Groups)
    const { data: dbClients, error } = await supabase.from('clients').select('legacy_group_id');
    if (error) {
        console.error('Error fetching DB clients:', error);
        return;
    }
    const dbGroupIds = new Set(dbClients.map(c => c.legacy_group_id?.toString()));

    // 3. Filter Missing
    const missing = csvGroups.filter(g => !dbGroupIds.has(g.id));
    console.log(`Found ${missing.length} missing groups to migrate.`);

    if (missing.length === 0) {
        console.log('No missing groups found.');
        return;
    }

    // 4. Prepare Data
    const clientsToInsert = missing.map(g => ({
        name: g.nome,
        legacy_group_id: parseInt(g.id),
        is_active: g.excluido !== '1',
        person_type: 'Pessoa Jurídica', // Default
        notes: `Importado de grupo.csv. ID Pai: ${g.id_grupo_pai}`,
        created_at: g.data_cadastro !== '\\N' ? g.data_cadastro : new Date().toISOString()
    }));

    // 5. Insert in Batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
        const batch = clientsToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase.from('clients').insert(batch);

        if (insertError) {
            console.error(`Error inserting batch ${i}:`, insertError);
        } else {
            console.log(`Processed batch ${i} - ${i + batch.length}`);
        }
    }

    console.log('✅ Missing Groups Migration Complete.');
}

migrateMissingGroups();
