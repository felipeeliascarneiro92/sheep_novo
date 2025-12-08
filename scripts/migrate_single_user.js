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

async function migrateSingleUser() {
    console.log('📂 Lendo arquivo de usuários...');
    const usuarios = readCSV(path.join(csvDir, 'usuario.csv'));

    // Buscar lista de legacy_ids de clientes existentes no Supabase para garantir o match
    const { data: existingClients } = await supabase
        .from('clients')
        .select('legacy_id')
        .not('legacy_id', 'is', null);

    const validGroupIds = new Set(existingClients.map(c => c.legacy_id.toString()));

    // Pegar o primeiro usuário cujo id_grupo existe no Supabase
    const user = usuarios.find(u =>
        u.id_grupo &&
        u.id_grupo !== '0' &&
        u.nome &&
        validGroupIds.has(u.id_grupo)
    );

    if (!user) {
        console.log('❌ Nenhum usuário válido encontrado para teste.');
        return;
    }

    console.log('👤 Usuário selecionado para teste:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.nome}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Grupo (Legacy ID): ${user.id_grupo}`);

    // Buscar o Client correspondente no Supabase (pelo legacy_id)
    console.log(`\n🔍 Buscando cliente (grupo) ID ${user.id_grupo} no Supabase...`);

    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('legacy_id', user.id_grupo)
        .maybeSingle();

    if (clientError) {
        console.error('❌ Erro ao buscar cliente:', clientError.message);
        return;
    }

    if (!client) {
        console.error(`❌ Cliente com legacy_id ${user.id_grupo} não encontrado no Supabase.`);
        ```
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

async function migrateSingleUser() {
    console.log('📂 Lendo arquivo de usuários...');
    const usuarios = readCSV(path.join(csvDir, 'usuario.csv'));

    // Buscar lista de legacy_ids de clientes existentes no Supabase para garantir o match
    const { data: existingClients } = await supabase
        .from('clients')
        .select('legacy_id')
        .not('legacy_id', 'is', null);

    const validGroupIds = new Set(existingClients.map(c => c.legacy_id.toString()));

    // Pegar o primeiro usuário cujo id_grupo existe no Supabase
    const user = usuarios.find(u =>
        u.id_grupo &&
        u.id_grupo !== '0' &&
        u.nome &&
        validGroupIds.has(u.id_grupo)
    );

    if (!user) {
        console.log('❌ Nenhum usuário válido encontrado para teste.');
        return;
    }

    console.log('👤 Usuário selecionado para teste:');
    console.log(`   ID: ${ user.id } `);
    console.log(`   Nome: ${ user.nome } `);
    console.log(`   Email: ${ user.email } `);
    console.log(`   Grupo(Legacy ID): ${ user.id_grupo } `);

    // Buscar o Client correspondente no Supabase (pelo legacy_id)
    console.log(`\n🔍 Buscando cliente(grupo) ID ${ user.id_grupo } no Supabase...`);

    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('legacy_id', user.id_grupo)
        .maybeSingle();

    if (clientError) {
        console.error('❌ Erro ao buscar cliente:', clientError.message);
        return;
    }

    if (!client) {
        console.error(`❌ Cliente com legacy_id ${ user.id_grupo } não encontrado no Supabase.`);
        console.log('   Certifique-se de que os clientes foram migrados corretamente.');
        return;
    }

    console.log(`✅ Cliente encontrado: ${ client.name } (UUID: ${ client.id })`);

    // Montar objeto Broker com sanitização
    const brokerData = {
        name: user.nome,
        email: (user.email && user.email !== '\\N') ? user.email : null,
        phone: (user.celular && user.celular !== '\\N') ? user.celular : null,
        creci: (user.creci && user.creci !== '\\N') ? user.creci : null,
        cpf: (user.cpf_cnpj && user.cpf_cnpj !== '\\N') ? user.cpf_cnpj : null,
        client_id: client.id,
        is_active: user.status === '1',
        legacy_id: parseInt(user.id)
    };

    console.log('\n💾 Dados preparados para importação:');
    console.log(JSON.stringify(brokerData, null, 2));

    try {
        // Verificar duplicidade
        const { data: existingBroker, error: findError } = await supabase
            .from('brokers')
            .select('id')
            .eq('legacy_id', brokerData.legacy_id)
            .maybeSingle();

        if (findError) throw findError;

        if (existingBroker) {
            console.log(`\n⚠️ Usuário já existe(ID: ${ existingBroker.id }).Atualizando...`);
            const { error } = await supabase
                .from('brokers')
                .update(brokerData)
                .eq('id', existingBroker.id);
            
            if (error) throw error;
            console.log('✅ Usuário atualizado com sucesso!');
        } else {
            console.log('\n🆕 Inserindo novo usuário...');
            const { data, error } = await supabase
                .from('brokers')
                .insert([brokerData])
                .select();
            
            if (error) throw error;
            console.log(`✅ Usuário importado com sucesso! ID: ${ data[0].id } `);
        }
    } catch (err) {
        console.error('\n❌ ERRO FATAL NA IMPORTAÇÃO:');
        console.error(err.message);
        if (err.details) console.error('Detalhes:', err.details);
        if (err.hint) console.error('Dica:', err.hint);
    }
}

migrateSingleUser();
```
