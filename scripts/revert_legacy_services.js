
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function revertLegacyServices() {
    console.log('Reverting creation of placeholder legacy services...');

    // Delete services where ID starts with 'legacy_'
    const { data, error } = await supabase
        .from('services')
        .delete()
        .ilike('id', 'legacy_%')
        .select();

    if (error) {
        console.error('Error deleting services:', error);
    } else {
        console.log(`Deleted ${data.length} placeholder services.`);
        data.forEach(s => console.log(` - Deleted: ${s.name} (${s.id})`));
    }
}

revertLegacyServices();
