
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMaster() {
    console.log('Checking Broker with Legacy ID 1...');
    const { data: broker, error } = await supabase
        .from('brokers')
        .select('*')
        .eq('legacy_id', 1)
        .maybeSingle();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!broker) {
        console.log('Broker legacy_id 1 not found in DB.');
    } else {
        console.log('Broker found:', {
            id: broker.id,
            name: broker.name,
            legacy_id: broker.legacy_id,
            permissions: broker.permissions
        });
    }
}

debugMaster();
