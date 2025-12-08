
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
const csvDir = path.join(__dirname, '../csv_antigos');

async function inspectBooking47452() {
    console.log('--- Inspecting Booking 47452 ---');

    // 1. Check Supabase Data
    const { data: booking, error } = await supabase
        .from('bookings')
        .select('id, legacy_id, service_ids, total_price, service_price_overrides, address, unit_details, notes')
        .eq('legacy_id', 47452)
        .single();

    if (error) {
        console.error('Supabase Error:', error);
    } else {
        console.log('Supabase Data:', JSON.stringify(booking, null, 2));

        // Check Service Names
        if (booking.service_ids && booking.service_ids.length > 0) {
            const { data: services } = await supabase.from('services').select('id, name').in('id', booking.service_ids);
            console.log('Mapped Services:', services);
        }
    }

    // 2. Check CSV Data (servicos_itens.csv)
    const servicosItensContent = fs.readFileSync(path.join(csvDir, 'servicos_itens.csv'), 'utf-8');
    const servicosItens = parse(servicosItensContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    const items = servicosItens.filter(i => i.id_servico === '47452');
    console.log('\nCSV Items (servicos_itens.csv):', items);

    // 3. Check CSV Data (servicos.csv) for address/notes
    const servicosContent = fs.readFileSync(path.join(csvDir, 'servicos.csv'), 'utf-8');
    const servicos = parse(servicosContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });
    const servico = servicos.find(s => s.id === '47452');
    console.log('\nCSV Service (servicos.csv):', {
        obs: servico?.obs,
        numero_predial: servico?.numero_predial,
        complemento: servico?.complemento,
        id_endereco: servico?.id_endereco
    });
}

inspectBooking47452();
