
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deduplicateClients() {
    console.log('Starting Deduplication...');

    // Fetch all clients
    let allClients = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('clients')
            .select('id, legacy_group_id, created_at')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) break;
        if (data.length === 0) break;

        allClients = allClients.concat(data);
        page++;
    }

    console.log(`Fetched ${allClients.length} clients.`);

    // Group by legacy_group_id
    const groups = {};
    allClients.forEach(c => {
        if (c.legacy_group_id) {
            if (!groups[c.legacy_group_id]) groups[c.legacy_group_id] = [];
            groups[c.legacy_group_id].push(c);
        }
    });

    const idsToDelete = [];

    for (const legacyId in groups) {
        const list = groups[legacyId];
        if (list.length > 1) {
            // Sort by created_at ascending (keep oldest)
            list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            // Keep first, delete rest
            const toDelete = list.slice(1);
            toDelete.forEach(c => idsToDelete.push(c.id));
        }
    }

    console.log(`Found ${idsToDelete.length} duplicate records to delete.`);

    if (idsToDelete.length > 0) {
        // Delete in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
            const batch = idsToDelete.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('clients').delete().in('id', batch);
            if (error) {
                console.error('Error deleting batch:', error);
            } else {
                console.log(`Deleted batch ${i} - ${i + batch.length}`);
            }
        }
    }

    console.log('Deduplication Complete.');
}

deduplicateClients();
