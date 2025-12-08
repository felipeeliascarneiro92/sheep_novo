import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

function findLatestClient() {
    console.log('Reading clientes.csv...');
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));

    // Filter out clients without a valid ID
    const validClientes = clientes.filter(c => c.id && c.id !== '\\N');

    // Find the client with the highest ID (assuming IDs are sequential)
    let latestClient = validClientes[0];
    let maxId = parseInt(latestClient.id);

    validClientes.forEach(c => {
        const currentId = parseInt(c.id);
        if (currentId > maxId) {
            maxId = currentId;
            latestClient = c;
        }
    });

    console.log(`\nÚltimo cliente cadastrado:`);
    console.log(`ID: ${latestClient.id}`);
    console.log(`Nome: ${latestClient.nome}`);
    console.log(`Nome Fantasia: ${latestClient.nome_fantasia}`);
    console.log(`CPF/CNPJ: ${latestClient.cpf_cnpj}`);
    console.log(`\nIniciando migração...`);

    return latestClient.id;
}

const latestId = findLatestClient();

// Execute the migration script for this client
try {
    execSync(`node scripts/migrate_single_client.js ${latestId}`, { stdio: 'inherit' });
} catch (error) {
    console.error('Error during migration:', error.message);
}
