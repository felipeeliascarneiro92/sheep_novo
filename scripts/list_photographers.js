
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listPhotographers() {
    const { data: photographers, error } = await supabase
        .from('photographers')
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${photographers.length} photographers.`);
        photographers.forEach(p => console.log(` - ${p.name} (${p.id})`));
    }
}

listPhotographers();
