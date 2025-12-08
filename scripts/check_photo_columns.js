import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhotoColumnsExplicit() {
    const { data, error } = await supabase.from('photographers').select('id, name, email, phone, cpf, address').limit(1);
    if (error) console.error('Error:', error.message);
    else console.log('Columns exist!');
}

checkPhotoColumnsExplicit();
