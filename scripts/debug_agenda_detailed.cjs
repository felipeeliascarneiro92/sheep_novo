
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ptwpsuvkrcbkfkutddnq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0d3BzdXZrcmNia2ZrdXRkZG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzg4MTgsImV4cCI6MjA3OTc1NDgxOH0.qtbyUmkDeorMw3SyqL2kXsTq7ndQvU7nYnYirEozLlA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBookings() {
    console.log("--- DEBUG START ---");
    const today = '2025-12-09';

    // 1. Fetch photographers to find Guilherme's ID
    const { data: photographers } = await supabase
        .from('photographers')
        .select('id, name')
        .ilike('name', '%guilherme%');

    if (!photographers || photographers.length === 0) {
        console.log("No photographer named Guilherme found.");
        return;
    }

    const gui = photographers[0];
    console.log(`Photographer: ${gui.name} (ID: ${gui.id})`);

    // 2. Fetch bookings for this photographer on this date
    const { data: bookingsConfirmed, error } = await supabase
        .from('bookings')
        .select('id, date, status, photographer_id')
        .eq('date', today)
        .eq('photographer_id', gui.id);

    if (error) console.error(error);

    console.log(`Bookings on ${today} for ${gui.name}: ${bookingsConfirmed?.length || 0}`);

    if (bookingsConfirmed) {
        bookingsConfirmed.forEach(b => {
            console.log(` > ID: ${b.id} | Status: ${b.status} | Date: ${b.date}`);
        });
    }

    // 3. Fetch ALL bookings for this date to see if there is a mismatch
    const { data: allBookings } = await supabase
        .from('bookings')
        .select('id, date, photographer_id')
        .eq('date', today);

    console.log(`Total bookings on ${today}: ${allBookings?.length || 0}`);
    console.log("--- DEBUG END ---");
}

checkBookings();
