
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const legacyServices = [
    { id: 'foto_profissional', legacy_id: 6, name: 'Fotografia Profissional', price: 150.00 },
    { id: 'retirar_chaves', legacy_id: 10, name: 'Retirar Chaves na Imobiliária', price: 30.00 },
    // Placeholders for others
    { id: 'legacy_7', legacy_id: 7, name: 'Serviço Legado 7', price: 0 },
    { id: 'legacy_8', legacy_id: 8, name: 'Serviço Legado 8', price: 0 },
    { id: 'legacy_9', legacy_id: 9, name: 'Serviço Legado 9', price: 0 },
    { id: 'legacy_11', legacy_id: 11, name: 'Serviço Legado 11', price: 0 },
    { id: 'legacy_12', legacy_id: 12, name: 'Serviço Legado 12', price: 187.00 }, // Guessing price from stats
    { id: 'legacy_13', legacy_id: 13, name: 'Serviço Legado 13', price: 288.00 },
    { id: 'legacy_14', legacy_id: 14, name: 'Serviço Legado 14', price: 340.00 },
    { id: 'legacy_15', legacy_id: 15, name: 'Serviço Legado 15', price: 454.00 },
    { id: 'legacy_16', legacy_id: 16, name: 'Serviço Legado 16', price: 288.00 },
    { id: 'legacy_17', legacy_id: 17, name: 'Serviço Legado 17', price: 190.00 },
    { id: 'legacy_19', legacy_id: 19, name: 'Serviço Legado 19', price: 95.00 },
    { id: 'legacy_20', legacy_id: 20, name: 'Serviço Legado 20', price: 30.00 },
    { id: 'legacy_21', legacy_id: 21, name: 'Serviço Legado 21', price: 46.00 },
    { id: 'legacy_22', legacy_id: 22, name: 'Serviço Legado 22', price: 94.00 },
    { id: 'legacy_23', legacy_id: 23, name: 'Serviço Legado 23', price: 700.00 },
    { id: 'legacy_24', legacy_id: 24, name: 'Serviço Legado 24', price: 150.00 },
    { id: 'legacy_25', legacy_id: 25, name: 'Serviço Legado 25', price: 150.00 },
    { id: 'legacy_26', legacy_id: 26, name: 'Serviço Legado 26', price: 150.00 },
    { id: 'legacy_27', legacy_id: 27, name: 'Serviço Legado 27', price: 150.00 },
    { id: 'legacy_29', legacy_id: 29, name: 'Serviço Legado 29', price: 149.00 },
    { id: 'legacy_30', legacy_id: 30, name: 'Serviço Legado 30', price: 40.00 },
    { id: 'legacy_31', legacy_id: 31, name: 'Serviço Legado 31', price: 10.00 },
    { id: 'legacy_32', legacy_id: 32, name: 'Serviço Legado 32', price: 0.00 }
];

async function seedServices() {
    console.log('Seeding legacy services...');

    for (const service of legacyServices) {
        const { data, error } = await supabase
            .from('services')
            .upsert({
                id: service.id,
                legacy_id: service.legacy_id,
                name: service.name,
                price: service.price,
                duration_minutes: 60, // Default
                category: 'Outros',
                status: 'Ativo',
                is_visible_to_client: true
            }, { onConflict: 'id' })
            .select();

        if (error) {
            console.error(`Error upserting service ${service.id}:`, error);
        } else {
            console.log(`Upserted service ${service.id} (Legacy ID: ${service.legacy_id})`);
        }
    }
}

seedServices();
