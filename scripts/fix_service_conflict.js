
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixService() {
    console.log('Fixing service conflict...');

    // 1. Find the existing service
    const { data: existing } = await supabase
        .from('services')
        .select('id')
        .eq('name', 'Fotografia Profissional')
        .single();

    if (existing && existing.id !== 'foto_profissional') {
        console.log(`Renaming existing service (ID: ${existing.id})...`);
        const { error: updateError } = await supabase
            .from('services')
            .update({ name: 'Fotografia Profissional (Old)' })
            .eq('id', existing.id);

        if (updateError) {
            console.error('Error renaming:', updateError);
            return;
        }
    }

    // 2. Create the new service
    console.log('Creating "foto_profissional" service...');
    const newService = {
        id: 'foto_profissional',
        name: 'Fotografia Profissional',
        duration_minutes: 60,
        price: 150.00,
        category: 'Foto',
        status: 'Ativo',
        description: 'Sessão de fotos profissional para imóveis.',
        is_visible_to_client: true
    };

    const { data, error } = await supabase
        .from('services')
        .insert([newService])
        .select();

    if (error) {
        console.error('Error creating service:', error);
    } else {
        console.log('Success! Service created:', data);
    }
}

fixService();
