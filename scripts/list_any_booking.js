
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAnyBooking() {
    const { data, error } = await supabase
        .from('bookings')
        .select('id, legacy_id, photographer_id')
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Bookings:', data);
    }
}

listAnyBooking();
