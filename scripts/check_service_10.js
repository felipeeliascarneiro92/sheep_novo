
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkService10() {
    console.log('Checking Service with Legacy ID 10...');
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('legacy_id', 10)
        .maybeSingle();

    if (data) {
        console.log('Found:', data);
    } else {
        console.log('Not Found!');
    }

    console.log('\nChecking Booking 47452 Service IDs...');
    const { data: booking } = await supabase
        .from('bookings')
        .select('service_ids, total_price, service_price_overrides')
        .eq('legacy_id', 47452)
        .single();
    console.log('Booking Data:', booking);
}

checkService10();
