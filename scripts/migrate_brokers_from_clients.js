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

async function migrateBrokersFromClients() {
    console.log('🚀 Iniciando migração de Corretores a partir da tabela de Clientes...');

    // 1. Ler arquivos
    console.log('📂 Lendo CSVs...');
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));
    const enderecos = readCSV(path.join(csvDir, 'endereco.csv'));

    // Criar mapa de endereços para busca rápida
    const enderecoMap = new Map();
    enderecos.forEach(e => enderecoMap.set(e.id, e));

    // 2. Filtrar os 52 corretores (id_cliente_tipo_pessoa == '0')
    const corretores = clientes.filter(c => c.id_cliente_tipo_pessoa === '0');

    console.log(`📊 Encontrados ${corretores.length} registros de corretores (não-master) em clientes.csv.`);

    if (corretores.length === 0) {
        console.log('⚠️ Nenhum corretor encontrado com esse filtro.');
        return;
    }

    // 3. Buscar todos os clientes (imobiliárias) já migrados para fazer o vínculo
    // Precisamos do map: legacy_id (id_grupo) -> uuid (client_id)
    const { data: existingClients, error } = await supabase
        .from('clients')
        .select('id, legacy_id')
        .not('legacy_id', 'is', null);

    if (error) {
        console.error('❌ Erro ao buscar clientes no Supabase:', error.message);
        return;
    }

    const clientMap = new Map();
    existingClients.forEach(c => clientMap.set(c.legacy_id.toString(), c.id));

    console.log(`✓ Mapa de imobiliárias carregado (${clientMap.size} registros).`);

    // 4. Processar e Inserir
    let success = 0;
    let errors = 0;
    let skipped = 0;

    for (const corretor of corretores) {
        try {
            // Buscar dados de contato no endereço
            const address = enderecoMap.get(corretor.id_endereco);

            let email = null;
            let phone = null;

            if (address) {
                if (address.email && address.email !== '\\N') email = address.email;
                if (address.celular && address.celular !== '\\N') phone = address.celular;
                if (!phone && address.telefone && address.telefone !== '\\N') phone = address.telefone;
            }

            // Identificar a Imobiliária (Grupo)
            const groupId = corretor.id_grupo;
            const clientId = clientMap.get(groupId);

            if (!clientId) {
                console.log(`⚠️ Pular corretor "${corretor.nome}" (ID: ${corretor.id}): Grupo ${groupId} não encontrado no Supabase.`);
                skipped++;
                continue;
            }

            const brokerData = {
                name: corretor.nome_fantasia && corretor.nome_fantasia !== '\\N' ? corretor.nome_fantasia : corretor.nome,
                email: email,
                phone: phone,
                cpf: corretor.cpf_cnpj !== '\\N' ? corretor.cpf_cnpj : null,
                client_id: clientId,
                is_active: corretor.status === '1',
                legacy_id: parseInt(corretor.id) // Mantemos o ID original para referência
            };

            // Verificar se já existe
            const { data: existing } = await supabase
                .from('brokers')
                .select('id')
                .eq('legacy_id', brokerData.legacy_id)
                .maybeSingle();

            if (existing) {
                // Atualizar
                const { error: updateError } = await supabase
                    .from('brokers')
                    .update(brokerData)
                    .eq('id', existing.id);

                if (updateError) throw updateError;
                // console.log(`🔄 Atualizado: ${brokerData.name}`);
            } else {
                // Inserir
                const { error: insertError } = await supabase
                    .from('brokers')
                    .insert([brokerData]);

                if (insertError) throw insertError;
                // console.log(`✅ Inserido: ${brokerData.name}`);
            }
            success++;

        } catch (err) {
            console.error(`❌ Erro no corretor ID ${corretor.id}: ${err.message}`);
            errors++;
        }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  MIGRAÇÃO DE CORRETORES (CLIENTES TIPO 0)');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Processados com sucesso: ${success}`);
    console.log(`⚠️ Pulados (sem imobiliária): ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    console.log('═══════════════════════════════════════════════════════\n');
}

migrateBrokersFromClients();
