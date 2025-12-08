import { supabase } from '../services/supabase.ts';

async function checkOrosClient() {
    console.log('🔍 Buscando cliente OROS no Supabase...\n');

    const { data, error } = await supabase
        .from('clients')
        .select('id, name, trade_name, cnpj')
        .or('name.ilike.%oros%,trade_name.ilike.%oros%');

    if (error) {
        console.error('❌ Erro ao buscar:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ Cliente OROS não encontrado no banco de dados.');
        console.log('\n💡 Próximo passo: Migrar o cliente OROS do CSV para o Supabase');
        console.log('   Use o script: node scripts/migrate_oros_client.js\n');
        return;
    }

    console.log(`✅ ${data.length} cliente(s) OROS encontrado(s):\n`);
    data.forEach((c, idx) => {
        console.log(`${idx + 1}. Nome: ${c.name}`);
        console.log(`   Nome Fantasia: ${c.trade_name}`);
        console.log(`   CNPJ: ${c.cnpj}`);
        console.log(`   ID: ${c.id}\n`);
    });
}

checkOrosClient()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro:', err);
        process.exit(1);
    });
