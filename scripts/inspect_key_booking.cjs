
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectBooking() {
    // Find booking for Guilherme on Dec 9th
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            *,
            clients (name),
            photographers (name)
        `)
        .eq('date', '2025-12-09')
        .ilike('photographers.name', '%Guilherme%');

    if (error) {
        console.error("Error fetching", error);
        return;
    }

    if (!bookings || bookings.length === 0) {
        console.log("No bookings found for Guilherme on 2025-12-09");
        return;
    }

    console.log(`Found ${bookings.length} bookings.`);

    for (const b of bookings) {
        console.log(`\nBooking ID: ${b.id}`);
        console.log(`Client: ${b.clients?.name}`);
        console.log(`Service IDs:`, b.service_ids);

        console.log(`Service IDs (RAW): ${JSON.stringify(b.service_ids)}`);

        // Check "retirar_chaves"
        const hasKey = b.service_ids && b.service_ids.includes('retirar_chaves');
        console.log(`Has 'retirar_chaves'? ${hasKey}`);

        // Fetch service details for these IDs to see names
        if (b.service_ids && b.service_ids.length > 0) {
            const { data: services } = await supabase.from('services').select('id, name').in('id', b.service_ids);
            console.log("Services found in DB:", services);
        }
    }
}

inspectBooking();
