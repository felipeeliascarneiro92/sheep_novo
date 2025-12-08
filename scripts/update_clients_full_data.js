
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const csvDir = path.join(__dirname, '../csv_antigos');

async function updateClientsData() {
    console.log('🚀 Starting Client Data Update...');

    // 1. Load CSVs
    console.log('Reading CSV files...');
    const clientesContent = fs.readFileSync(path.join(csvDir, 'clientes.csv'), 'utf-8');
    const clientes = parse(clientesContent, { columns: true, skip_empty_lines: true, delimiter: ';', relax_quotes: true });

    const enderecosContent = fs.readFileSync(path.join(csvDir, 'endereco.csv'), 'utf-8');
    const enderecos = parse(enderecosContent, { columns: true, skip_empty_lines: true, delimiter: ';', relax_quotes: true });

    // Index for speed
    const clientByGroup = {};
    clientes.forEach(c => {
        if (c.id_grupo && c.id_grupo !== '\\N') {
            clientByGroup[c.id_grupo] = c;
        }
    });

    const addressById = {};
    enderecos.forEach(a => {
        addressById[a.id] = a;
    });

    console.log(`Loaded ${clientes.length} clients and ${enderecos.length} addresses.`);

    // 2. Fetch Supabase Clients
    let dbClients = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('clients')
            .select('id, legacy_group_id')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching DB clients:', error);
            break;
        }
        if (data.length === 0) break;
        dbClients = dbClients.concat(data);
        page++;
    }
    console.log(`Fetching ${dbClients.length} clients from DB.`);

    // 3. Prepare Updates
    const updates = [];
    let skipped = 0;

    for (const dbClient of dbClients) {
        if (!dbClient.legacy_group_id) {
            skipped++;
            continue;
        }

        const csvClient = clientByGroup[dbClient.legacy_group_id];
        if (!csvClient) {
            // console.log(`No CSV data for group ${dbClient.legacy_group_id}`);
            skipped++;
            continue;
        }

        // Map Data (Logic from migrate_single_client.js)
        const address = addressById[csvClient.id_endereco];

        // Name & Trade Name
        const name = csvClient.nome_fantasia && csvClient.nome_fantasia !== '\\N' ? csvClient.nome_fantasia : csvClient.nome;
        const tradeName = csvClient.nome_fantasia !== '\\N' ? csvClient.nome_fantasia : null;

        // CPF/CNPJ
        const doc = csvClient.cpf_cnpj !== '\\N' ? csvClient.cpf_cnpj : null;
        let cpf = null;
        let cnpj = null;
        let personType = 'Pessoa Física';

        if (doc) {
            const cleanDoc = doc.replace(/\D/g, '');
            if (cleanDoc.length > 11) {
                personType = 'Pessoa Jurídica';
                cnpj = doc;
            } else {
                personType = 'Pessoa Física';
                cpf = doc;
            }
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

        if (!email && csvClient.email && csvClient.email !== '\\N') {
            email = csvClient.email;
        }

        // Payment
        let paymentMethod = 'Outro';
        let paymentType = 'Pré-pago';

        if (csvClient.id_forma_pagamento === '13') {
            paymentMethod = 'Boleto';
            paymentType = 'Pós-pago';
        } else if (csvClient.id_forma_pagamento === '16') {
            paymentMethod = 'Pix';
            paymentType = 'Pré-pago';
        }

        const dueDay = csvClient.dia_vencimento !== '\\N' ? parseInt(csvClient.dia_vencimento) : null;

        updates.push({
            id: dbClient.id,
            legacy_id: parseInt(csvClient.id), // Link legacy_id from clientes.csv
            name: name, // Update name just in case
            trade_name: tradeName,
            person_type: personType,
            cpf: cpf,
            cnpj: cnpj,
            due_day: dueDay,
            payment_method: paymentMethod,
            payment_type: paymentType,
            asaas_customer_id: csvClient.id_asaas !== '\\N' ? csvClient.id_asaas : null,
            phone: phone,
            mobile_phone: mobilePhone,
            email: email,
            address: addressData
        });
    }

    console.log(`Prepared updates for ${updates.length} clients. Skipped ${skipped}.`);

    // 4. Execute Updates
    const BATCH_SIZE = 50;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);

        // We have to update one by one or use upsert. Upsert requires all unique keys.
        // Since we are updating by ID, upsert works if we provide ID.
        const { error } = await supabase.from('clients').upsert(batch);

        if (error) {
            console.error(`Error updating batch ${i}:`, error);
        } else {
            console.log(`Updated batch ${i} - ${i + batch.length}`);
        }
    }

    console.log('✅ Client Data Update Complete.');
}

updateClientsData();
