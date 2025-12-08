import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local');
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

async function migrateClient(legacyId) {
    console.log(`Starting migration for client with legacy_id: ${legacyId}`);

    // Read CSVs
    console.log('Reading CSV files...');
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));
    const enderecos = readCSV(path.join(csvDir, 'endereco.csv'));

    // Find client
    const client = clientes.find(c => c.id === legacyId);
    if (!client) {
        console.error(`Client with id ${legacyId} not found in clientes.csv`);
        return;
    }

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
        // User requested to put everything in CNPJ column
        cnpj = doc;
    }

    // Address & Phone
    let mobilePhone = null;
    let phone = null;
    let email = null;
    let addressData = null;

    if (address) {
        // Map to frontend expected structure: street, number, neighborhood, city, state, zip
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
        // Map commercial phone if phone is empty
        if (!phone && address.comercial && address.comercial !== '\\N') phone = address.comercial;

        if (address.email && address.email !== '\\N') email = address.email;
    }

    // Fallback email from client if not in address
    if (!email && client.email && client.email !== '\\N') {
        email = client.email;
    }

    // Payment Method
    // Mapping based on analysis:
    // 13 -> Boleto (Pós-pago)
    // 16 -> Pix (Pré-pago)
    // Others -> Outro
    let paymentMethod = 'Outro';
    let paymentType = 'Pré-pago'; // Default

    if (client.id_forma_pagamento === '13') {
        paymentMethod = 'Boleto';
        paymentType = 'Pós-pago';
    } else if (client.id_forma_pagamento === '16') {
        paymentMethod = 'Pix';
        paymentType = 'Pré-pago';
    }

    // Due Day
    const dueDay = client.dia_vencimento !== '\\N' ? parseInt(client.dia_vencimento) : null;

    const clientData = {
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

    console.log('Prepared client data:', JSON.stringify(clientData, null, 2));

    // Check existence
    const { data: existing, error: findError } = await supabase
        .from('clients')
        .select('id')
        .eq('legacy_id', clientData.legacy_id)
        .maybeSingle();

    if (findError) {
        console.error('Error checking existence:', findError);
        return;
    }

    if (existing) {
        console.log(`Client already exists with UUID: ${existing.id}. Updating...`);
        const { error: updateError } = await supabase
            .from('clients')
            .update(clientData)
            .eq('id', existing.id);

        if (updateError) {
            console.error('Error updating client:', updateError);
        } else {
            console.log('Client updated successfully.');
        }
    } else {
        console.log('Inserting new client...');
        const { error: insertError } = await supabase
            .from('clients')
            .insert(clientData);

        if (insertError) {
            console.error('Error inserting client:', insertError);
        } else {
            console.log('Client inserted successfully.');
        }
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Please provide a client ID to migrate. Usage: node scripts/migrate_single_client.js <id>');
} else {
    migrateClient(args[0]);
}
