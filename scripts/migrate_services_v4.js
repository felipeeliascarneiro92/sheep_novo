import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSingleMigration() {
    console.log('Testing single migration without CSV read...');

    // Mock data from CSV ID 1
    const servico = {
        id: '1',
        id_corretor: '466',
        id_fotografo: '22',
        data_prevista: '2023-03-27',
        hora_prevista: '13:00:00',
        status: '3', // Concluido
        drop_imagens: 'https://dropbox.com/link'
    };

    // Need to fetch client ID manually or hardcode for test
    // Assuming client ID exists for broker 466 -> group -> client
    // Let's just fetch ANY client for this test
    const { data: client } = await supabase.from('clients').select('id').limit(1).single();
    const clientId = client.id;

    const bookingData = {
        client_id: clientId,
        date: `${servico.data_prevista}T${servico.hora_prevista}`,
        start_time: '13:00',
        status: 'Concluído',
        address: 'Test Address Manual',
        google_drive_folder_link: servico.drop_imagens,
        total_price: 150.00,
        legacy_id: parseInt(servico.id),
        service_ids: [],
        created_at: new Date().toISOString()
    };

    console.log('Inserting:', bookingData);

    const { data, error } = await supabase.from('bookings').insert(bookingData).select();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

testSingleMigration();
