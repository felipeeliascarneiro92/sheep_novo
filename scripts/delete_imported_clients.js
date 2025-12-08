import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteImportedClients() {
    console.log('Attempting to delete imported clients...');

    // First, check if legacy_id column exists by trying to select it
    const { error: checkError } = await supabase
        .from('clients')
        .select('legacy_id')
        .limit(1);

    if (checkError) {
        if (checkError.message.includes('does not exist')) {
            console.error('Column "legacy_id" does not exist. Cannot identify imported clients by legacy_id.');
            console.log('If you want to delete ALL clients, please confirm.');
            return;
        }
        console.error('Error checking schema:', checkError.message);
        return;
    }

    // Count clients with legacy_id
    const { count, error: countError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .not('legacy_id', 'is', null);

    if (countError) {
        console.error('Error counting imported clients:', countError.message);
        return;
    }

    console.log(`Found ${count} imported clients (with legacy_id).`);

    if (count === 0) {
        console.log('No imported clients found to delete.');
        return;
    }

    // 1. Get IDs of clients to delete
    const { data: clientsToDelete, error: fetchError } = await supabase
        .from('clients')
        .select('id')
        .not('legacy_id', 'is', null);

    if (fetchError) {
        console.error('Error fetching client IDs:', fetchError.message);
        return;
    }

    const clientIds = clientsToDelete.map(c => c.id);
    console.log(`Preparing to delete ${clientIds.length} clients and their associated data...`);

    if (clientIds.length > 0) {
        const deleteInBatches = async (table, column, ids) => {
            const BATCH_SIZE = 100;
            for (let i = 0; i < ids.length; i += BATCH_SIZE) {
                const batch = ids.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .in(column, batch);

                if (error) {
                    console.error(`Error deleting from ${table} batch ${i}-${i + BATCH_SIZE}:`, error.message);
                    throw error;
                }
            }
            console.log(`Deleted records from ${table}.`);
        };

        try {
            // Delete from dependent tables
            await deleteInBatches('bookings', 'client_id', clientIds);
            await deleteInBatches('brokers', 'client_id', clientIds);
            await deleteInBatches('invoices', 'client_id', clientIds);
            await deleteInBatches('editing_requests', 'client_id', clientIds);
            await deleteInBatches('transactions', 'client_id', clientIds);
        } catch (e) {
            console.error('Aborting client deletion due to error in dependent tables.');
            return;
        }
    }

    // 3. Delete clients
    const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .not('legacy_id', 'is', null);

    if (deleteError) {
        console.error('Error deleting clients:', deleteError.message);
    } else {
        console.log(`Successfully deleted imported clients.`);
    }
}

deleteImportedClients();
