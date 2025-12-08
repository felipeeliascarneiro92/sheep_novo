
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureServiceExists() {
    const serviceId = 'foto_profissional';

    console.log(`Checking if service '${serviceId}' exists...`);
    const { data: existing, error: checkError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .maybeSingle();

    if (checkError) {
        console.error('Error checking service:', checkError);
        return;
    }

    if (existing) {
        console.log(`Service '${serviceId}' already exists:`, existing);
    } else {
        console.log(`Service '${serviceId}' not found. Creating it...`);
        const newService = {
            id: serviceId,
            name: 'Fotografia Profissional',
            duration_minutes: 60,
            price: 150.00,
            category: 'Foto',
            status: 'Ativo',
            description: 'Sessão de fotos profissional para imóveis.',
            is_visible_to_client: true
        };

        const { data: created, error: createError } = await supabase
            .from('services')
            .insert([newService])
            .select();

        if (createError) {
            console.error('Error creating service:', createError);
        } else {
            console.log('Service created successfully:', created);
        }
    }
}

ensureServiceExists();
