
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllServices() {
    console.log('Listing ALL services in Supabase to verify legacy_id status...');
    const { data, error } = await supabase
        .from('services')
        .select('id, name, legacy_id')
        .order('name');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Current Services Table State:');
        console.table(data);
        console.log('\nJSON Output:', JSON.stringify(data, null, 2));
    }
}

listAllServices();
