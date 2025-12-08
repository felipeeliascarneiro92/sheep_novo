import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verifyLastBroker() {
    console.log('🔍 Verificando último broker inserido...');

    const { data: broker, error } = await supabase
        .from('brokers')
        .select(`
            id, 
            name, 
            legacy_id, 
            client_id,
            clients (
                id,
                name,
                legacy_id,
                legacy_group_id
            )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.log('\n👤 CORRETOR (Broker):');
    console.log(`   Nome: ${broker.name}`);
    console.log(`   Legacy ID (Usuário): ${broker.legacy_id}`);

    console.log('\n🏢 IMOBILIÁRIA VINCULADA (Client):');
    if (broker.clients) {
        console.log(`   Nome: ${broker.clients.name}`);
        console.log(`   Legacy ID (Cliente): ${broker.clients.legacy_id}`);
        console.log(`   Legacy Group ID: ${broker.clients.legacy_group_id}`);

        // Verificação Lógica
        // O legacy_group_id do cliente deve ser o id_grupo que estava no usuario.csv
        // Infelizmente não temos o id_grupo do usuário aqui para comparar diretamente sem ler o CSV de novo,
        // mas podemos ver se faz sentido (ex: legacy_group_id não deve ser null).
    } else {
        console.log('❌ Nenhuma imobiliária vinculada (Join falhou ou client_id inválido).');
    }
}

verifyLastBroker();
