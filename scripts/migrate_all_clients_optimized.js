import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env or .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const csvDir = path.join(process.cwd(), 'csv_antigos');

// Helper to read CSV
function readCSV(filePath) {
    const content = fs.readFileSync(filePath);
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true,
    });
}

// Função para processar um único cliente (lógica extraída do migrate_single_client.js)
function mapClientData(client, enderecos) {
    // Find address
    const address = enderecos.find(a => a.id === client.id_endereco);

    // Transform Data
    const name = client.nome_fantasia && client.nome_fantasia !== '\\N' ? client.nome_fantasia : client.nome;
    const tradeName = client.nome_fantasia !== '\\N' ? client.nome_fantasia : null;

    // CPF/CNPJ & Person Type
    const doc = client.cpf_cnpj !== '\\N' ? client.cpf_cnpj : null;
    let cpf = null;
    let cnpj = null;
    let personType = 'Física'; // Default

    if (doc) {
        const cleanDoc = doc.replace(/\D/g, '');
        if (cleanDoc.length > 11) {
            personType = 'Jurídica';
        } else {
            personType = 'Física';
        }
        cnpj = doc; // User requested to put everything in CNPJ column
    }

    // Address & Phone
    let mobilePhone = null;
    let phone = null;
    let email = null;
    let addressData = null;

    if (address) {
        addressData = {
            street: address.logradouro !== '\\N' ? address.logradouro : '',
            number: address.numero !== '\\N' ? address.numero : '',
            complement: address.complemento !== '\\N' ? address.complemento : '',
            neighborhood: address.bairro !== '\\N' ? address.bairro : '',
            city: address.cidade !== '\\N' ? address.cidade : '',
            state: address.estado !== '\\N' ? address.estado : '',
            zip: address.cep !== '\\N' ? address.cep : '',
            reference: address.referencia !== '\\N' ? address.referencia : '',
            observation: address.observacao !== '\\N' ? address.observacao : '',
        };

        if (address.celular && address.celular !== '\\N') mobilePhone = address.celular;
        if (address.telefone && address.telefone !== '\\N') phone = address.telefone;
        if (!phone && address.comercial && address.comercial !== '\\N') phone = address.comercial;
        if (address.email && address.email !== '\\N') email = address.email;
    }

    if (!email && client.email && client.email !== '\\N') {
        email = client.email;
    }

    // Payment Method
    let paymentMethod = 'Outro';
    let paymentType = 'Pré-pago';

    if (client.id_forma_pagamento === '13') {
        paymentMethod = 'Boleto';
        paymentType = 'Pós-pago';
    } else if (client.id_forma_pagamento === '16') {
        paymentMethod = 'Pix';
        paymentType = 'Pré-pago';
    }

    const dueDay = client.dia_vencimento !== '\\N' ? parseInt(client.dia_vencimento) : null;

    return {
        name: name,
        trade_name: tradeName,
        person_type: personType,
        cpf: cpf,
        cnpj: cnpj,
        due_day: dueDay,
        payment_method: paymentMethod,
        payment_type: paymentType,
        asaas_customer_id: client.id_asaas !== '\\N' ? client.id_asaas : null,
        legacy_id: parseInt(client.id),
        legacy_group_id: client.id_grupo !== '\\N' ? parseInt(client.id_grupo) : null,
        phone: phone,
        mobile_phone: mobilePhone,
        email: email,
        address: addressData,
        is_active: true
    };
}

async function migrateAllClients() {
    console.log('🚀 Iniciando migração em massa otimizada...');

    // 1. Ler todos os dados para memória (são apenas alguns MBs, ok para Node)
    console.log('📂 Lendo arquivos CSV...');
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));
    const enderecos = readCSV(path.join(csvDir, 'endereco.csv'));

    console.log(`📊 Total de clientes encontrados: ${clientes.length}`);
    console.log(`📊 Total de endereços encontrados: ${enderecos.length}`);

    // 2. Processar em lotes
    const BATCH_SIZE = 50;
    let processed = 0;
    let errors = 0;
    let updated = 0;
    let inserted = 0;

    for (let i = 0; i < clientes.length; i += BATCH_SIZE) {
        const batch = clientes.slice(i, i + BATCH_SIZE);
        console.log(`\n🔄 Processando lote ${Math.floor(i / BATCH_SIZE) + 1} (${i + 1} a ${Math.min(i + BATCH_SIZE, clientes.length)})...`);

        const promises = batch.map(async (client) => {
            try {
                const clientData = mapClientData(client, enderecos);

                // Upsert (Insert or Update) based on legacy_id
                // Supabase upsert requires the column to be a primary key or have a unique constraint.
                // Assuming 'legacy_id' is unique. If not, we might need to check existence first.
                // To be safe and match previous logic, let's check existence first or use upsert on ID if we had it.
                // Since we don't have the UUID map, we query by legacy_id.

                const { data: existing } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('legacy_id', clientData.legacy_id)
                    .maybeSingle();

                if (existing) {
                    const { error } = await supabase
                        .from('clients')
                        .update(clientData)
                        .eq('id', existing.id);
                    if (error) throw error;
                    updated++;
                } else {
                    const { error } = await supabase
                        .from('clients')
                        .insert(clientData);
                    if (error) throw error;
                    inserted++;
                }
            } catch (err) {
                console.error(`❌ Erro no cliente ID ${client.id}: ${err.message}`);
                errors++;
            }
        });

        // Aguardar o lote terminar antes de ir para o próximo
        await Promise.all(promises);
        processed += batch.length;
        console.log(`   ✅ Progresso: ${processed}/${clientes.length} (Inseridos: ${inserted}, Atualizados: ${updated}, Erros: ${errors})`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  MIGRAÇÃO CONCLUÍDA');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Total Processado: ${processed}`);
    console.log(`🆕 Inseridos: ${inserted}`);
    console.log(`🔄 Atualizados: ${updated}`);
    console.log(`❌ Erros: ${errors}`);
    console.log('═══════════════════════════════════════════════════════\n');
}

migrateAllClients();
