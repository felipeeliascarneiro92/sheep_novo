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

async function fixBrokerPhones() {
    console.log('🚀 Iniciando correção de telefones dos Corretores...');

    // 1. Ler CSVs
    console.log('📂 Lendo arquivos CSV...');
    const usuarios = readCSV(path.join(csvDir, 'usuario.csv'));
    const enderecos = readCSV(path.join(csvDir, 'endereco.csv'));

    // Criar mapa de endereços
    const enderecoMap = new Map();
    enderecos.forEach(e => enderecoMap.set(e.id, e));

    // 2. Filtrar corretores (master=0 ou null)
    const corretores = usuarios.filter(u =>
        (u.master === '0' || u.master === '\\N') &&
        u.id_grupo &&
        u.id_grupo !== '0'
    );

    console.log(`📊 Total de corretores para verificar: ${corretores.length}`);

    let updated = 0;
    let errors = 0;
    let noPhone = 0;

    const BATCH_SIZE = 50;

    for (let i = 0; i < corretores.length; i += BATCH_SIZE) {
        const batch = corretores.slice(i, i + BATCH_SIZE);
        console.log(`\n🔄 Processando lote ${Math.floor(i / BATCH_SIZE) + 1}...`);

        const promises = batch.map(async (user) => {
            try {
                // Buscar telefone no endereço
                let phone = null;
                if (user.id_endereco && user.id_endereco !== '\\N') {
                    const address = enderecoMap.get(user.id_endereco);
                    if (address) {
                        if (address.celular && address.celular !== '\\N') phone = address.celular;
                        if (!phone && address.telefone && address.telefone !== '\\N') phone = address.telefone;
                    }
                }

                if (!phone) {
                    noPhone++;
                    return; // Nada a atualizar
                }

                // Atualizar no Supabase
                const { error } = await supabase
                    .from('brokers')
                    .update({ phone: phone })
                    .eq('legacy_id', parseInt(user.id));

                if (error) throw error;
                updated++;

            } catch (err) {
                console.error(`❌ Erro no usuário ${user.id}: ${err.message}`);
                errors++;
            }
        });

        await Promise.all(promises);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  CORREÇÃO DE TELEFONES CONCLUÍDA');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Telefones Atualizados: ${updated}`);
    console.log(`⚠️ Sem telefone no cadastro: ${noPhone}`);
    console.log(`❌ Erros: ${errors}`);
    console.log('═══════════════════════════════════════════════════════\n');
}

fixBrokerPhones();
