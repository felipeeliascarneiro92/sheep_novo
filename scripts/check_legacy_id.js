
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listColumns() {
    console.log('Checking columns of bookings table...');
    // We can't easily list columns via supabase-js without a specific RPC or hack.
    // But we can try to select a column and see if it errors.

    const { data, error } = await supabase.from('bookings').select('legacy_id').limit(1);

    if (error) {
        console.log('legacy_id column check failed:', error.message);
    } else {
        console.log('legacy_id column exists.');
    }
}

listColumns();
