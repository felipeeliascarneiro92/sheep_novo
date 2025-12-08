
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentBookings() {
    const { data, error } = await supabase
        .from('bookings')
        .select('id, legacy_id, photographer_id')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Recent Bookings:', data);

        for (const b of data) {
            if (b.photographer_id) {
                const { data: p } = await supabase.from('photographers').select('id, name').eq('id', b.photographer_id).single();
                console.log(`Booking ${b.legacy_id} -> Photographer: ${p?.name} (${p?.id})`);
            }
        }
    }
}

checkRecentBookings();
