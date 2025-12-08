import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('bookings').select('*').limit(1);
    if (error) {
        console.error('Error selecting from bookings:', error);
    } else {
        console.log('Bookings table exists. Data:', data);
    }
}

check();
