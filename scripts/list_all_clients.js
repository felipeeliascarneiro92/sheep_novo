import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://izrquzkspbflnlgcyccl.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cnF1emtzcGJmbG5sZ2N5Y2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3OTc5NzUsImV4cCI6MjA0NzM3Mzk3NX0.cKL5l1qNIIZUQjPzfCEaHhNEW-KFkr8B6xAGSGsEf88';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listAllClients() {
    console.log('📋 Listando todos os clientes cadastrados no Supabase...\n');

    const { data, error } = await supabase
        .from('clients')
        .select('id, name, trade_name, cnpj')
        .order('name');

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️  Nenhum cliente encontrado no banco de dados.\n');
        return;
    }

    console.log(`✅ Total de ${data.length} cliente(s) encontrado(s):\n`);
    console.log('═══════════════════════════════════════════════════════\n');

    data.forEach((c, idx) => {
        console.log(`${idx + 1}. ${c.name}`);
        if (c.trade_name && c.trade_name !== c.name) {
            console.log(`   Nome Fantasia: ${c.trade_name}`);
        }
        console.log(`   CNPJ: ${c.cnpj || 'N/A'}`);
        console.log(`   ID: ${c.id}`);
        console.log('');
    });

    // Buscar especificamente por "Oros"
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 Buscando especificamente por "Oros"...\n');

    const { data: orosData, error: orosError } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', '%oros%');

    if (orosError) {
        console.error('❌ Erro na busca:', orosError.message);
    } else if (orosData && orosData.length > 0) {
        console.log(`✅ ${orosData.length} cliente(s) com "Oros" no nome:\n`);
        orosData.forEach(c => {
            console.log(`Nome: ${c.name}`);
            console.log(`ID: ${c.id}\n`);
        });
    } else {
        console.log('❌ Nenhum cliente com "Oros" no nome encontrado.\n');
    }
}

listAllClients()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro fatal:', err);
        process.exit(1);
    });
