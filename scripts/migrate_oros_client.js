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

function findClientByAsaasId(asaasId) {
    console.log(`Buscando cliente com ID Asaas: ${asaasId}...`);
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));

    const client = clientes.find(c => c.id_asaas === asaasId);

    if (!client) {
        console.log('Cliente não encontrado por ID Asaas. Tentando buscar por CNPJ...');
        return null;
    }

    console.log(`\n✓ Cliente encontrado!`);
    console.log(`ID: ${client.id}`);
    console.log(`Nome: ${client.nome}`);
    console.log(`Nome Fantasia: ${client.nome_fantasia}`);
    console.log(`CPF/CNPJ: ${client.cpf_cnpj}`);
    console.log(`ID Asaas: ${client.id_asaas}`);

    return client.id;
}

const asaasId = 'cus_000148938805';
const clientId = findClientByAsaasId(asaasId);

if (clientId) {
    console.log(`\nIniciando migração do cliente ID ${clientId}...\n`);
    try {
        execSync(`node scripts/migrate_single_client.js ${clientId}`, { stdio: 'inherit' });
    } catch (error) {
        console.error('Erro durante a migração:', error.message);
    }
} else {
    console.log('❌ Cliente não encontrado nos CSVs.');
}
