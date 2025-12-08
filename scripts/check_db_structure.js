import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStructure() {
    console.log('Checking table structures...');

    const { data: photographers, error: photoError } = await supabase.from('photographers').select('*').limit(1);
    if (photoError) console.error('Error checking photographers:', photoError.message);
    else console.log('Photographers columns:', photographers.length > 0 ? Object.keys(photographers[0]) : 'Table empty or no access');

    const { data: clients, error: clientError } = await supabase.from('clients').select('*').limit(1);
    if (clientError) console.error('Error checking clients:', clientError.message);
    else console.log('Clients columns:', clients.length > 0 ? Object.keys(clients[0]) : 'Table empty or no access');

    const { data: bookings, error: bookingError } = await supabase.from('bookings').select('*').limit(1);
    if (bookingError) console.error('Error checking bookings:', bookingError.message);
    else console.log('Bookings columns:', bookings.length > 0 ? Object.keys(bookings[0]) : 'Table empty or no access');
}

checkStructure();
