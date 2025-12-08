
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function updateKeyServiceDuration() {
    console.log('Updating "retirar_chaves" service duration to 0...');

    // Update by ID 'retirar_chaves' legacy ID
    const { data, error } = await supabase
        .from('services')
        .update({ duration_minutes: 0 })
        .eq('id', 'retirar_chaves')
        .select();

    if (error) {
        console.error('Error updating service by ID "retirar_chaves":', error);
    } else if (data && data.length > 0) {
        console.log('Service updated successfully (by ID):', data);
    } else {
        console.log('Service ID "retirar_chaves" not found. Trying by name...');
        const { data: dataByName, error: errorByName } = await supabase
            .from('services')
            .update({ duration_minutes: 0 })
            .ilike('name', '%Retirar Chaves%')
            .select();

        if (errorByName) {
            console.error('Error updating service by name:', errorByName);
        } else {
            console.log('Service updated successfully (by Name):', dataByName);
        }
    }
}

updateKeyServiceDuration();
