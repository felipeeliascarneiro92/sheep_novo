
import { supabase } from './services/supabase';

const OLD_ID = 'bbd1a9d9-0f04-4751-8963-3af2cd16461d';
const NEW_ID = 'foto_profissional';

async function mergeServices() {
    console.log('Starting service merge...');

    // 1. Update Bookings
    console.log('Updating Bookings...');
    const { data: bookings, error: bookingError } = await supabase.from('bookings').select('id, service_ids');
    if (bookingError) { console.error('Error fetching bookings', bookingError); return; }

    for (const b of bookings) {
        if (b.service_ids && Array.isArray(b.service_ids) && b.service_ids.includes(OLD_ID)) {
            let newIds = b.service_ids.filter(id => id !== OLD_ID);
            if (!newIds.includes(NEW_ID)) {
                newIds.push(NEW_ID);
            }
            const { error } = await supabase.from('bookings').update({ service_ids: newIds }).eq('id', b.id);
            if (error) console.error(`Failed to update booking ${b.id}`, error);
            else console.log(`Updated booking ${b.id}`);
        }
    }

    // 2. Update Photographers
    console.log('Updating Photographers...');
    const { data: photographers, error: phError } = await supabase.from('photographers').select('id, services');
    if (phError) { console.error('Error fetching photographers', phError); return; }

    for (const p of photographers) {
        if (p.services && Array.isArray(p.services) && p.services.includes(OLD_ID)) {
            let newIds = p.services.filter(id => id !== OLD_ID);
            if (!newIds.includes(NEW_ID)) {
                newIds.push(NEW_ID);
            }
            const { error } = await supabase.from('photographers').update({ services: newIds }).eq('id', p.id);
            if (error) console.error(`Failed to update photographer ${p.id}`, error);
            else console.log(`Updated photographer ${p.id}`);
        }
    }

    // 3. Update Clients (custom_prices)
    console.log('Updating Clients...');
    const { data: clients, error: clientError } = await supabase.from('clients').select('id, custom_prices');
    if (clientError) { console.error('Error fetching clients', clientError); return; }

    for (const c of clients) {
        if (!c.custom_prices) continue;
        const prices = c.custom_prices;
        if (prices[OLD_ID] !== undefined) {
            const oldValue = prices[OLD_ID];
            // Remove old key
            delete prices[OLD_ID];
            // Set new key if not exists (or maybe overwrite? user wants to merge, usually keep specific price)
            if (prices[NEW_ID] === undefined) {
                prices[NEW_ID] = oldValue;
            }

            const { error } = await supabase.from('clients').update({ custom_prices: prices }).eq('id', c.id);
            if (error) console.error(`Failed to update client ${c.id}`, error);
            else console.log(`Updated client ${c.id}`);
        }
    }

    // 4. Update Network Prices
    console.log('Updating Network Prices...');
    const { data: netPrices, error: netError } = await supabase.from('network_prices').select('id, network_id, service_id');
    if (netError) { console.error('Error fetching network prices', netError); return; }

    for (const np of netPrices) {
        if (np.service_id === OLD_ID) {
            // Check if there is already a price for NEW_ID in this network
            const exists = netPrices.find(x => x.network_id === np.network_id && x.service_id === NEW_ID);
            if (exists) {
                // If collision, delete the old one
                await supabase.from('network_prices').delete().eq('id', np.id);
                console.log(`Deleted redundant network price ${np.id}`);
            } else {
                // Update to NEW_ID
                await supabase.from('network_prices').update({ service_id: NEW_ID }).eq('id', np.id);
                console.log(`Updated network price ${np.id}`);
            }
        }
    }

    // 5. Delete Old Service
    console.log('Deleting Old Service...');
    const { error: delError } = await supabase.from('services').delete().eq('id', OLD_ID);
    if (delError) console.error('Error deleting service', delError);
    else console.log('Successfully deleted old service.');

    console.log('Merge complete!');
}

mergeServices();
