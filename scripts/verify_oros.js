import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Environment variables not set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyOrosClient() {
    // Search by legacy_id
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('legacy_id', 2726)
        .single();

    if (error) {
        console.error('❌ Erro ao buscar cliente:', error);
        return;
    }

    console.log('\n✓ Cliente OROS encontrado no banco!\n');
    console.log('════════════════════════════════════════');
    console.log(`ID (UUID): ${data.id}`);
    console.log(`Legacy ID: ${data.legacy_id}`);
    console.log(`Nome: ${data.name}`);
    console.log(`Nome Fantasia: ${data.trade_name}`);
    console.log(`Tipo Pessoa: ${data.person_type}`);
    console.log(`CNPJ: ${data.cnpj}`);
    console.log(`───────────────────────────────────────`);
    console.log(`ID Asaas: ${data.asaas_customer_id}`);
    console.log(`Método Pagamento: ${data.payment_method}`);
    console.log(`Tipo Pagamento: ${data.payment_type}`);
    console.log(`Dia Vencimento: ${data.due_day || 'N/A'}`);
    console.log(`───────────────────────────────────────`);
    console.log('Endereço:');
    if (data.address) {
        console.log(`  Logradouro: ${data.address.street || 'N/A'}`);
        console.log(`  Número: ${data.address.number || 'N/A'}`);
        console.log(`  Bairro: ${data.address.neighborhood || 'N/A'}`);
        console.log(`  Cidade: ${data.address.city || 'N/A'}`);
        console.log(`  Estado: ${data.address.state || 'N/A'}`);
        console.log(`  CEP: ${data.address.zip || 'N/A'}`);
    } else {
        console.log('  (sem endereço)');
    }
    console.log(`───────────────────────────────────────`);
    console.log(`Telefone: ${data.phone || 'N/A'}`);
    console.log(`Celular: ${data.mobile_phone || 'N/A'}`);
    console.log(`Email: ${data.email || 'N/A'}`);
    console.log(`Ativo: ${data.is_active ? 'Sim' : 'Não'}`);
    console.log('════════════════════════════════════════\n');

    // Save to JSON
    fs.writeFileSync('oros_verification.json', JSON.stringify(data, null, 2));
    console.log('✓ Dados salvos em oros_verification.json\n');
}

verifyOrosClient();
