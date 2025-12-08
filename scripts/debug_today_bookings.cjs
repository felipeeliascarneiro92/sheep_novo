
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ptwpsuvkrcbkfkutddnq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0d3BzdXZrcmNia2ZrdXRkZG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzg4MTgsImV4cCI6MjA3OTc1NDgxOH0.qtbyUmkDeorMw3SyqL2kXsTq7ndQvU7nYnYirEozLlA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBookings() {
    const today = '2025-12-08';

    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_price, clients(name)')
        .eq('date', today);

    bookings.forEach(b => {
        if (b.total_price === 0) {
            console.log(`ZERO_PRICE_WARNING: Client=${b.clients?.name} has 0 price!`);
        } else {
            console.log(`NORMAL_PRICE: Client=${b.clients?.name} Price=${b.total_price}`);
        }
    });
}

checkBookings();
