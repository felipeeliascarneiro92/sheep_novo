
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createKeyService() {
    console.log('Creating "Retirar Chaves na Imobiliária" service...');

    const newService = {
        id: 'retirar_chaves', // Using a readable ID
        name: 'Retirar Chaves na Imobiliária',
        duration_minutes: 30, // Estimated
        price: 15.00, // Based on the user's screenshot
        category: 'Outros',
        status: 'Ativo',
        description: 'Serviço de retirada de chaves para acesso ao imóvel.',
        is_visible_to_client: true,
        legacy_id: 10
    };

    const { data, error } = await supabase
        .from('services')
        .upsert([newService]) // Upsert to avoid duplicates if ID exists
        .select();

    if (error) {
        console.error('Error creating service:', error);
    } else {
        console.log('Service created successfully:', data);
    }
}

createKeyService();
