
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    console.log('Checking for duplicates in clients...');

    // Fetch all clients (with pagination)
    let allClients = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('clients')
            .select('id, legacy_group_id')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error:', error);
            break;
        }

        if (data.length === 0) break;

        allClients = allClients.concat(data);
        page++;
    }

    console.log(`Total clients fetched: ${allClients.length}`);

    const counts = {};
    allClients.forEach(c => {
        if (c.legacy_group_id) {
            counts[c.legacy_group_id] = (counts[c.legacy_group_id] || 0) + 1;
        }
    });

    const duplicates = Object.entries(counts).filter(([id, count]) => count > 1);
    console.log(`Found ${duplicates.length} duplicates.`);

    if (duplicates.length > 0) {
        console.log('Sample duplicates:', duplicates.slice(0, 5));
    }
}

checkDuplicates();
