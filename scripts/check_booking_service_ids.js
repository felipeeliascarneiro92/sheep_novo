
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookingServiceIds() {
    console.log('Checking service_ids in bookings...');
    const { data, error } = await supabase.from('bookings').select('service_ids').limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample service_ids:', JSON.stringify(data, null, 2));
    }
}

checkBookingServiceIds();
