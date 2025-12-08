
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listServices() {
    console.log('Listing services...');
    const { data, error } = await supabase.from('services').select('id, name');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Services found:', data);
    }
}

listServices();
