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

async function migratePhotographers() {
    console.log('Reading CSVs...');
    const usuarios = await readCSV(path.join(csvDir, 'usuario.csv'));
    const enderecos = await readCSV(path.join(csvDir, 'endereco.csv'));

    // Filter Photographers (Type 2)
    const photographers = usuarios.filter(u => u.id_usuario_tipo === '2');
    console.log(`Found ${photographers.length} photographers.`);

    // Address Map
    const addressMap = {};
    enderecos.forEach(e => {
        addressMap[e.id] = e;
    });

    let migratedCount = 0;

    for (const p of photographers) {
        const legacyId = parseInt(p.id);
        const email = p.email;
        const name = p.nome;
        let phone = p.celular_validador !== '\\N' ? p.celular_validador : null;

        // Resolve Address & Extra Phone
        const endereco = addressMap[p.id_endereco];
        let fullAddress = null;

        if (endereco) {
            const parts = [endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.estado];
            fullAddress = parts.filter(part => part && part !== '\\N').join(', ');

            if (!phone) {
                if (endereco.celular && endereco.celular !== '\\N') phone = endereco.celular;
                else if (endereco.telefone && endereco.telefone !== '\\N') phone = endereco.telefone;
            }
        }

        const cpf = p.cpf_cnpj && p.cpf_cnpj !== '\\N' ? p.cpf_cnpj : null;

        // Check if exists
        const { data: existing } = await supabase
            .from('photographers')
            .select('id')
            .or(`legacy_id.eq.${legacyId},email.eq.${email}`)
            .maybeSingle();

        const photoData = {
            name: name,
            email: email,
            phone: phone,
            legacy_id: legacyId,
            cpf: cpf,
            address: fullAddress,
            // status: 'active' // If needed
        };

        if (existing) {
            // Update
            const { error } = await supabase.from('photographers').update(photoData).eq('id', existing.id);
            if (error) console.error(`Error updating photographer ${name}:`, error.message);
            else {
                // console.log(`Updated photographer ${name}`);
                migratedCount++;
            }
        } else {
            // Insert
            const { error } = await supabase.from('photographers').insert(photoData);
            if (error) console.error(`Error inserting photographer ${name}:`, error.message);
            else {
                console.log(`Migrated photographer ${name}`);
                migratedCount++;
            }
        }
    }

    console.log(`\nMigration Finished. Processed ${migratedCount} photographers.`);
}

migratePhotographers().catch(console.error);
