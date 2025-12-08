import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const csvDir = path.join(__dirname, '../csv_antigos');

async function readCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true,
    });
}

async function migrateClientsFull() {
    console.log('Reading CSVs...');
    const clientes = await readCSV(path.join(csvDir, 'clientes.csv'));
    const enderecos = await readCSV(path.join(csvDir, 'endereco.csv'));

    // Address Map
    const addressMap = {};
    enderecos.forEach(e => {
        addressMap[e.id] = e;
    });

    console.log(`Migrating ${clientes.length} clients...`);
    let migratedCount = 0;

    for (const targetClient of clientes) {
        const legacyId = parseInt(targetClient.id);
        const legacyGroupId = parseInt(targetClient.id_grupo);
        const name = targetClient.nome_fantasia && targetClient.nome_fantasia !== '\\N' ? targetClient.nome_fantasia : targetClient.nome;

        if (!name) continue;

        const tradeName = targetClient.nome_fantasia !== '\\N' ? targetClient.nome_fantasia : null;

        // Person Type: 1 = Física, 2 = Jurídica
        const personType = targetClient.id_cliente_tipo_pessoa === '1' ? 'Física' : (targetClient.id_cliente_tipo_pessoa === '2' ? 'Jurídica' : 'Outro');

        // CPF/CNPJ
        const doc = targetClient.cpf_cnpj !== '\\N' ? targetClient.cpf_cnpj : null;
        let cpf = null;
        let cnpj = null;

        if (doc) {
            const cleanDoc = doc.replace(/\D/g, '');
            if (cleanDoc.length > 11) {
                cnpj = doc;
            } else {
                cpf = doc;
            }
        }

        // Address
        const endereco = addressMap[targetClient.id_endereco];
        let fullAddress = null;
        let phone = null;
        let email = null;

        if (endereco) {
            const parts = [endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.estado];
            fullAddress = parts.filter(p => p && p !== '\\N').join(', ');
            if (endereco.cep && endereco.cep !== '\\N') fullAddress += ` - CEP: ${endereco.cep}`;

            if (endereco.celular && endereco.celular !== '\\N') phone = endereco.celular;
            else if (endereco.telefone && endereco.telefone !== '\\N') phone = endereco.telefone;

            if (endereco.email && endereco.email !== '\\N') email = endereco.email;
        }

        const clientData = {
            name: name,
            trade_name: tradeName,
            person_type: personType,
            cpf: cpf,
            cnpj: cnpj,
            due_day: targetClient.dia_vencimento !== '\\N' ? parseInt(targetClient.dia_vencimento) : null,
            payment_method: targetClient.id_forma_pagamento !== '\\N' ? targetClient.id_forma_pagamento : null,
            asaas_customer_id: targetClient.id_asaas !== '\\N' ? targetClient.id_asaas : null,
            legacy_id: legacyId,
            legacy_group_id: legacyGroupId,
            phone: phone,
            email: email,
            address: fullAddress,
        };

        const { error } = await supabase.from('clients').upsert(clientData);

        if (error) {
            console.error(`Error migrating client ${legacyId}:`, error.message);
        } else {
            migratedCount++;
        }
    }

    console.log(`\nMigration Finished. Processed ${migratedCount} clients.`);
}

// Don't run automatically, wait for user approval
// migrateClientsFull().catch(console.error);
