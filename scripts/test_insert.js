import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log('Testing minimal insert...');

    // Fetch a valid client
    const { data: client } = await supabase.from('clients').select('id').limit(1).single();
    if (!client) {
        console.error('No clients found');
        return;
    }

    const bookingData = {
        client_id: client.id,
        date: new Date().toISOString(),
        status: 'Pendente',
        address: 'Test Address',
        total_price: 100,
        // Add fields one by one to test
        start_time: '10:00',
        service_ids: [], // Empty array
        google_drive_folder_link: 'http://test.com',
        legacy_id: 12345
    };

    const { data, error } = await supabase.from('bookings').insert(bookingData).select();

    if (error) {
        console.error('Insert Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Insert Success:', data);
    }
}

testInsert();
