
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServiceName() {
    console.log('Checking service with name "Fotografia Profissional"...');
    const { data, error } = await supabase.from('services').select('*').eq('name', 'Fotografia Profissional');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found services:', data.map(s => ({ id: s.id, name: s.name })));
    }
}

checkServiceName();
