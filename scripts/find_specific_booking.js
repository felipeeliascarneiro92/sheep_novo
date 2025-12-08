
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findSpecificBooking() {
    console.log('Searching for 48677...');
    const { data: b1, error: e1 } = await supabase.from('bookings').select('*').eq('legacy_id', 48677).maybeSingle();
    console.log('48677:', b1 || e1);

    if (b1 && b1.photographer_id) {
        const { data: p } = await supabase.from('photographers').select('id, name').eq('id', b1.photographer_id).single();
        console.log('Photographer for 48677:', p);
    }

    console.log('Searching for 48676...');
    const { data: b2, error: e2 } = await supabase.from('bookings').select('*').eq('legacy_id', 48676).maybeSingle();
    console.log('48676:', b2 || e2);

    if (b2 && b2.photographer_id) {
        const { data: p } = await supabase.from('photographers').select('id, name').eq('id', b2.photographer_id).single();
        console.log('Photographer for 48676:', p);
    }
}

findSpecificBooking();
