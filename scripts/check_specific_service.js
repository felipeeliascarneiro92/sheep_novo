
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificService() {
    console.log('Checking for service with id="foto_profissional"...');
    const { data, error } = await supabase.from('services').select('*').eq('id', 'foto_profissional');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found:', data);
    }
}

checkSpecificService();
