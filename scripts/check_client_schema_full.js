import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClientSchema() {
    console.log('Checking clients table schema...');
    const { data, error } = await supabase.from('clients').select('*').limit(1);

    if (error) {
        console.error('Error fetching schema:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Existing columns:', Object.keys(data[0]).sort());
    } else {
        // If table is empty, insert a dummy row to see columns returned, or try to infer from error if we select a non-existent column
        console.log('Table is empty. Cannot infer columns from data. Trying to insert dummy to get structure error or success.');
        // This is risky, better to trust the user's report about cpf/cnpj columns and check if they exist via a specific select
        const { error: err2 } = await supabase.from('clients').select('trade_name, person_type, cpf, cnpj, due_day, payment_method, asaas_customer_id').limit(1);
        if (err2) console.log('Missing columns check:', err2.message);
        else console.log('Columns trade_name, person_type, cpf, cnpj, due_day, payment_method, asaas_customer_id EXIST.');
    }
}

checkClientSchema();
