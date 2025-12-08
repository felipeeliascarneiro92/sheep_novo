
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookingPhotographer() {
    console.log('Checking migrated bookings...');

    // Fetch the 2 most recent bookings (legacy_id 48677 and 48676)
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, legacy_id, photographer_id')
        .in('legacy_id', [48677, 48676]);

    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }

    console.log('Bookings found:', bookings);

    for (const booking of bookings) {
        if (booking.photographer_id) {
            const { data: photographer, error: pError } = await supabase
                .from('photographers')
                .select('id, name, legacy_id')
                .eq('id', booking.photographer_id)
                .single();

            if (pError) {
                console.error(`Error fetching photographer for booking ${booking.legacy_id}:`, pError);
            } else {
                console.log(`Booking ${booking.legacy_id} linked to Photographer: ${photographer.name} (ID: ${photographer.id}, Legacy: ${photographer.legacy_id})`);
            }
        } else {
            console.log(`Booking ${booking.legacy_id} has NO photographer_id`);
        }
    }
}

checkBookingPhotographer();
