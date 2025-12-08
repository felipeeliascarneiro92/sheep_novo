import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhotoStructure() {
    const { data, error } = await supabase.from('photographers').select('*').limit(1);
    if (error) console.error(error);
    else console.log('Photographers Columns:', data.length > 0 ? Object.keys(data[0]) : 'Table empty');
}

checkPhotoStructure();
