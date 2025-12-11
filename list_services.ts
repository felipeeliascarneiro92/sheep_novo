
import { supabase } from './services/supabase';

async function listServices() {
    const { data: services, error } = await supabase.from('services').select('id, name').order('name');
    if (error) {
        console.error('Error fetching services:', error);
        return;
    }
    services.forEach(s => console.log(`${s.id}: ${s.name}`));
}

listServices();
