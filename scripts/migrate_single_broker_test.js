import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const csvDir = path.join(process.cwd(), 'csv_antigos');

function readCSV(filePath) {
    const content = fs.readFileSync(filePath);
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true,
    });
}

async function migrateSingleBrokerTest() {
    try {
        console.log('📂 Lendo arquivo de usuários...');
        const usuarios = readCSV(path.join(csvDir, 'usuario.csv'));

        // Buscar lista de legacy_group_ids de clientes existentes no Supabase
        const { data: existingClients } = await supabase
            .from('clients')
            .select('legacy_group_id')
            .not('legacy_group_id', 'is', null);

        const validGroupIds = new Set(existingClients.map(c => c.legacy_group_id.toString()));

        // Filtrar corretores (master = 0 ou \N) que tenham grupo válido
        const corretores = usuarios.filter(u =>
            (u.master === '0' || u.master === '\\N') &&
            u.id_grupo &&
            u.id_grupo !== '0' &&
            validGroupIds.has(u.id_grupo)
        );

        if (corretores.length === 0) {
            console.log('❌ Nenhum corretor válido encontrado para teste.');
            return;
        }

        console.log(`📊 Encontrados ${corretores.length} candidatos a corretor.`);

        // Escolher um aleatório
        const randomIndex = Math.floor(Math.random() * corretores.length);
        const user = corretores[randomIndex];

        console.log('\n👤 Corretor selecionado para teste:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Nome: ${user.nome}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Master: ${user.master}`);
        console.log(`   Grupo (Legacy ID): ${user.id_grupo}`);

        // Buscar o Client correspondente no Supabase
        // CORREÇÃO: Buscar pelo legacy_group_id (que corresponde ao id_grupo do usuário)
        // e não pelo legacy_id (que é o ID do cliente)
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id, name')
            .eq('legacy_group_id', user.id_grupo)
            .maybeSingle();

        if (clientError || !client) {
            console.error('❌ Erro ao buscar cliente:', clientError?.message || 'Cliente não encontrado');
            return;
        }

        console.log(`✅ Imobiliária vinculada: ${client.name} (UUID: ${client.id})`);

        // Montar objeto Broker
        // Nota: creci e cpf não existem na tabela brokers atual
        const brokerData = {
            name: user.nome,
            email: (user.email && user.email !== '\\N') ? user.email : null,
            phone: (user.celular && user.celular !== '\\N') ? user.celular : null,
            client_id: client.id,
            is_active: user.status === '1',
            legacy_id: parseInt(user.id),
            has_login: true
        };

        console.log('\n💾 Tentando inserir no Supabase...');
        console.log(JSON.stringify(brokerData, null, 2));

        // Verificar se já existe
        const { data: existingBroker } = await supabase
            .from('brokers')
            .select('id')
            .eq('legacy_id', brokerData.legacy_id)
            .maybeSingle();

        if (existingBroker) {
            console.log(`\n⚠️ Corretor já existe (ID: ${existingBroker.id}). Atualizando...`);
            const { error } = await supabase
                .from('brokers')
                .update(brokerData)
                .eq('id', existingBroker.id);

            if (error) throw error;
            console.log('✅ Corretor atualizado com sucesso!');
        } else {
            const { data, error } = await supabase
                .from('brokers')
                .insert([brokerData])
                .select();

            if (error) throw error;
            console.log(`✅ Corretor importado com sucesso! ID: ${data[0].id}`);
        }

    } catch (err) {
        console.error('\n❌ ERRO FATAL NA IMPORTAÇÃO:');
        console.error('Mensagem:', err.message);
        if (err.details) console.error('Detalhes:', err.details);
        if (err.hint) console.error('Dica:', err.hint);
        if (err.code) console.error('Código PG:', err.code);
    }
}

migrateSingleBrokerTest();
