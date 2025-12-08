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

async function migrateSkippedBrokers() {
    console.log('🚀 Iniciando migração COMPLETA de Corretores (incluindo sem imobiliária)...');

    const usuarios = readCSV(path.join(csvDir, 'usuario.csv'));

    // Carregar mapa de Clientes
    console.log('🔍 Carregando mapa de clientes...');
    const { data: clients } = await supabase
        .from('clients')
        .select('id, legacy_group_id')
        .not('legacy_group_id', 'is', null);

    const clientMap = new Map();
    clients.forEach(c => {
        if (c.legacy_group_id) clientMap.set(c.legacy_group_id.toString(), c.id);
    });

    // Filtrar corretores
    const corretores = usuarios.filter(u =>
        (u.master === '0' || u.master === '\\N') &&
        u.id_grupo &&
        u.id_grupo !== '0'
    );

    console.log(`📊 Total de corretores para processar: ${corretores.length}`);

    let success = 0;
    let updated = 0;
    let orphans = 0;
    let errors = 0;

    const BATCH_SIZE = 50;

    for (let i = 0; i < corretores.length; i += BATCH_SIZE) {
        const batch = corretores.slice(i, i + BATCH_SIZE);
        console.log(`\n🔄 Processando lote ${Math.floor(i / BATCH_SIZE) + 1}...`);

        const promises = batch.map(async (user) => {
            try {
                let clientId = clientMap.get(user.id_grupo);

                if (!clientId) {
                    // Se não achou imobiliária, deixa null mas conta como órfão
                    clientId = null;
                    orphans++;
                }

                const brokerData = {
                    name: user.nome,
                    email: (user.email && user.email !== '\\N') ? user.email : null,
                    phone: (user.celular && user.celular !== '\\N') ? user.celular : null,
                    client_id: clientId,
                    is_active: user.status === '1',
                    legacy_id: parseInt(user.id),
                    has_login: true
                };

                const { data: existing } = await supabase
                    .from('brokers')
                    .select('id')
                    .eq('legacy_id', brokerData.legacy_id)
                    .maybeSingle();

                if (existing) {
                    const { error } = await supabase
                        .from('brokers')
                        .update(brokerData)
                        .eq('id', existing.id);
                    if (error) throw error;
                    updated++;
                } else {
                    const { error } = await supabase
                        .from('brokers')
                        .insert([brokerData]);
                    if (error) throw error;
                    success++;
                }

            } catch (err) {
                console.error(`❌ Erro no usuário ${user.id}: ${err.message}`);
                errors++;
            }
        });

        await Promise.all(promises);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  MIGRAÇÃO FINALIZADA');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Inseridos: ${success}`);
    console.log(`🔄 Atualizados: ${updated}`);
    console.log(`⚠️ Sem Imobiliária (Client ID = null): ${orphans}`);
    console.log(`❌ Erros: ${errors}`);
    console.log('═══════════════════════════════════════════════════════\n');
}

migrateSkippedBrokers();
