import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClientColumnsExplicit() {
    const { data, error } = await supabase.from('clients').select('id, name, phone, email, address, cpf').limit(1);
    if (error) console.error('Error:', error.message);
    else console.log('Columns exist!');
}

checkClientColumnsExplicit();
