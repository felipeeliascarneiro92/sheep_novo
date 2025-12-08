
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPermissionsStats() {
    console.log('--- Checking Broker Permissions Stats ---');

    let dbBrokers = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('brokers').select('permissions').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        dbBrokers = dbBrokers.concat(data);
        page++;
    }

    let trueCount = 0;
    let falseCount = 0;
    let undefinedCount = 0;

    dbBrokers.forEach(b => {
        if (b.permissions && b.permissions.canViewAllBookings === true) {
            trueCount++;
        } else if (b.permissions && b.permissions.canViewAllBookings === false) {
            falseCount++;
        } else {
            undefinedCount++;
        }
    });

    console.log(`Total Brokers: ${dbBrokers.length}`);
    console.log(`canViewAllBookings: TRUE  -> ${trueCount}`);
    console.log(`canViewAllBookings: FALSE -> ${falseCount}`);
    console.log(`canViewAllBookings: UNDEF -> ${undefinedCount}`);
}

checkPermissionsStats();
