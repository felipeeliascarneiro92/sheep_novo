import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('Cleaning up migrated test bookings...');

    // Delete bookings that have a legacy_id (assuming only migrated ones have it)
    const { error, count } = await supabase
        .from('bookings')
        .delete({ count: 'exact' })
        .not('legacy_id', 'is', null);

    if (error) {
        console.error('Error deleting bookings:', error);
    } else {
        console.log(`Deleted ${count} migrated bookings.`);
    }
}

cleanup();
