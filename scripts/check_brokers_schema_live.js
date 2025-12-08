
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrokersSchema() {
    console.log('--- Checking Brokers Table Schema ---');
    const { data, error } = await supabase.from('brokers').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]).join(', '));
        console.log('Sample Permissions:', JSON.stringify(data[0].permissions, null, 2));
    } else {
        console.log('Table is empty, cannot infer columns from data.');
    }
}

checkBrokersSchema();
