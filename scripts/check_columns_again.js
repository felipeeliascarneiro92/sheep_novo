import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('Checking bookings columns...');
    // We can't easily list columns via JS client without admin, but we can try to select a row and see keys
    const { data, error } = await supabase.from('bookings').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]).sort());
        } else {
            console.log('Table empty, cannot infer columns from data.');
            // Try to insert a dummy record to force an error that lists columns? No, that's messy.
            // Let's assume the previous check was partially right but truncated.
        }
    }
}

checkColumns();
