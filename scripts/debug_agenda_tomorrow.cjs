
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ptwpsuvkrcbkfkutddnq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0d3BzdXZrcmNia2ZrdXRkZG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzg4MTgsImV4cCI6MjA3OTc1NDgxOH0.qtbyUmkDeorMw3SyqL2kXsTq7ndQvU7nYnYirEozLlA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBookingsTomorrow() {
    const tomorrow = '2025-12-09';
    console.log(`Checking bookings for ${tomorrow}...`);

    // 1. Get all bookings for tomorrow
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id, 
            date, 
            status, 
            start_time,
            photographer_id,
            photographers ( name )
        `)
        .eq('date', tomorrow);

    if (error) {
        console.error("Error fetching bookings:", error);
        return;
    }

    // 2. Filter for specific photographer if needed, or just show all
    console.log(`Found ${bookings.length} bookings for ${tomorrow}.`);

    bookings.forEach(b => {
        console.log(`- Booking ${b.id}: Time=${b.start_time} | Status=${b.status} | Photographer=${b.photographers?.name} (ID: ${b.photographer_id})`);
    });

    // 3. Specifically check for 'Guilherme'
    const guilhermeBookings = bookings.filter(b => b.photographers?.name.toLowerCase().includes('guilherme'));
    console.log(`\nFiltered for 'Guilherme': ${guilhermeBookings.length} found.`);
}

checkBookingsTomorrow();
