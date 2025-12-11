
import { supabase } from './services/supabase';
import fs from 'fs';

async function listServices() {
    const { data: services, error } = await supabase.from('services').select('*');
    if (error) {
        fs.writeFileSync('services_output.txt', 'Error: ' + JSON.stringify(error));
        return;
    }
    const output = services.map(s => `${s.id} | ${s.name}`).join('\n');
    fs.writeFileSync('services_output.txt', output);
}

listServices();
