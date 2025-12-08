
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrokerPhones() {
    console.log('--- Checking Broker Phones in DB ---');

    const { data: brokers, error } = await supabase
        .from('brokers')
        .select('id, name, phone, legacy_id')
        .limit(10);

    if (error) {
        console.error('Error fetching brokers:', error);
        return;
    }

    console.log('Sample Brokers:', brokers);

    // Check how many have empty phones
    const { count, error: countError } = await supabase
        .from('brokers')
        .select('*', { count: 'exact', head: true })
        .is('phone', null);

    console.log(`Brokers with NULL phone: ${count}`);
}

checkBrokerPhones();
