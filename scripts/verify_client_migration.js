import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyClient(legacyId) {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('legacy_id', legacyId)
        .single();

    if (error) {
        console.error('Error fetching client:', error);
    } else {
        const output = {
            id: data.id,
            legacy_id: data.legacy_id,
            name: data.name,
            trade_name: data.trade_name,
            person_type: data.person_type,
            cpf: data.cpf,
            cnpj: data.cnpj,
            payment_method: data.payment_method,
            payment_type: data.payment_type,
            due_day: data.due_day,
            asaas_customer_id: data.asaas_customer_id,
            address: data.address,
            phone: data.phone,
            mobile_phone: data.mobile_phone,
            email: data.email
        };
        fs.writeFileSync('verification.json', JSON.stringify(output, null, 2));
        console.log('Verification written to verification.json');
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Please provide a legacy ID to verify.');
} else {
    verifyClient(args[0]);
}
