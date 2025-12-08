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

async function migrateClients() {
    console.log('Reading CSVs...');
    const clientes = await readCSV(path.join(csvDir, 'clientes.csv'));
    const enderecos = await readCSV(path.join(csvDir, 'endereco.csv'));

    console.log(`Found ${clientes.length} clients and ${enderecos.length} addresses.`);

    let migratedCount = 0;

    // Create Address Map for speed
    const addressMap = {};
    enderecos.forEach(e => {
        addressMap[e.id] = e;
    });

    for (const c of clientes) {
        const legacyId = parseInt(c.id);
        const legacyGroupId = parseInt(c.id_grupo);
        const name = c.nome_fantasia && c.nome_fantasia !== '\\N' ? c.nome_fantasia : c.nome;

        if (!name) continue;

        // Resolve Address
        const endereco = addressMap[c.id_endereco];
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

        // CPF/CNPJ
        const cpfCnpj = c.cpf_cnpj && c.cpf_cnpj !== '\\N' ? c.cpf_cnpj : null;

        // Check if exists
        const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .or(`legacy_group_id.eq.${legacyGroupId},legacy_id.eq.${legacyId}`)
            .maybeSingle();

        const clientData = {
            name: name,
            legacy_id: legacyId,
            legacy_group_id: legacyGroupId,
            phone: phone,
            email: email,
            address: fullAddress,
            cpf: cpfCnpj,
            // Add other fields if schema supports them
        };

        if (existing) {
            // Update
            const { error } = await supabase.from('clients').update(clientData).eq('id', existing.id);
            if (error) console.error(`Error updating client ${name}:`, error.message);
            else {
                // console.log(`Updated client ${name}`);
                migratedCount++;
            }
        } else {
            // Insert
            const { error } = await supabase.from('clients').insert(clientData);
            if (error) console.error(`Error inserting client ${name}:`, error.message);
            else {
                console.log(`Migrated client ${name}`);
                migratedCount++;
            }
        }
    }

    console.log(`\nMigration Finished. Processed ${migratedCount} clients.`);
}

migrateClients().catch(console.error);
