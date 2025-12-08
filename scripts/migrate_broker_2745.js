
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const csvPath = path.join(__dirname, '../csv_antigos/usuario.csv');

async function migrateBroker(targetLegacyId) {
    console.log(`Migrating Broker with Legacy ID: ${targetLegacyId}...`);

    // 1. Load CSV
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    const brokerRecord = records.find(r => r.id === targetLegacyId.toString());
    if (!brokerRecord) {
        console.error('Broker not found in CSV');
        return;
    }

    // 2. Find Client (Agency)
    const groupId = brokerRecord.id_grupo;
    const { data: client } = await supabase.from('clients').select('id').eq('legacy_group_id', groupId).single();

    if (!client) {
        console.error(`Client with legacy_group_id ${groupId} not found. Cannot link broker.`);
        return;
    }

    // 3. Insert Broker
    const newBroker = {
        name: brokerRecord.nome,
        email: brokerRecord.email,
        phone: brokerRecord.celular || brokerRecord.telefone,
        client_id: client.id,
        legacy_id: parseInt(targetLegacyId),
        is_active: brokerRecord.ativo === '1',
        has_login: true, // Assuming they had login
        permissions: { canSchedule: true, canViewAllBookings: false }
    };

    // Check if exists
    const { data: existing } = await supabase.from('brokers').select('id').eq('legacy_id', parseInt(targetLegacyId)).maybeSingle();

    let result;
    if (existing) {
        console.log('Broker already exists, updating...');
        const { data, error } = await supabase.from('brokers').update(newBroker).eq('id', existing.id).select().single();
        result = { data, error };
    } else {
        console.log('Broker does not exist, inserting...');
        const { data, error } = await supabase.from('brokers').insert([newBroker]).select().single();
        result = { data, error };
    }

    const { data, error } = result;

    if (error) {
        console.error('Error inserting broker:', error);
    } else {
        console.log('Broker migrated successfully:', data);

        // 4. Update Booking 47452
        console.log('Updating Booking 47452 to link to this broker...');
        const { error: bookingError } = await supabase
            .from('bookings')
            .update({ broker_id: data.id })
            .eq('legacy_id', 47452);

        if (bookingError) {
            console.error('Error updating booking:', bookingError);
        } else {
            console.log('Booking 47452 updated with broker_id.');
        }
    }
}

migrateBroker(2745);
