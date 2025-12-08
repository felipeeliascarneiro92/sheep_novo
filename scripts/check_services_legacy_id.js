
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServicesTable() {
    console.log('Checking services table structure and data...');
    const { data, error } = await supabase.from('services').select('id, name, legacy_id');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Services in Supabase:', JSON.stringify(data, null, 2));
    }
}

checkServicesTable();
