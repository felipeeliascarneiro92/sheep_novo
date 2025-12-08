import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupFull() {
    console.log('Cleaning up ALL migrated data (Services, Clients, Photographers)...');

    // 1. Delete Bookings
    const { count: bookingsCount, error: bError } = await supabase
        .from('bookings')
        .delete({ count: 'exact' })
        .not('legacy_id', 'is', null);

    if (bError) console.error('Error deleting bookings:', bError);
    else console.log(`Deleted ${bookingsCount} bookings.`);

    // 2. Delete Clients
    const { count: clientsCount, error: cError } = await supabase
        .from('clients')
        .delete({ count: 'exact' })
        .not('legacy_id', 'is', null);

    if (cError) console.error('Error deleting clients:', cError);
    else console.log(`Deleted ${clientsCount} clients.`);

    // 3. Delete Photographers
    const { count: photoCount, error: pError } = await supabase
        .from('photographers')
        .delete({ count: 'exact' })
        .not('legacy_id', 'is', null);

    if (pError) console.error('Error deleting photographers:', pError);
    else console.log(`Deleted ${photoCount} photographers.`);
}

cleanupFull();
