import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listServices() {
    const { data, error } = await supabase.from('services').select('id, name'); // Trying 'name'
    if (error) {
        // If name fails, try description
        const { data: data2, error: error2 } = await supabase.from('services').select('id, description');
        if (error2) console.error('Failed to list services:', error2);
        else console.log('Services (Description):', data2);
    }
    else console.log('Services (Name):', data);
}

listServices();
