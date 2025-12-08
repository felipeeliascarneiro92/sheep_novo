import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvDir = path.join(__dirname, '../csv_antigos');

const content = fs.readFileSync(path.join(csvDir, 'clientes.csv'), 'utf-8');
const clientes = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_quotes: true,
});

const withAsaas = clientes.find(c => c.id_asaas && c.id_asaas !== '\\N');

if (withAsaas) {
    console.log('Found client with Asaas ID:', withAsaas);
} else {
    console.log('No client with Asaas ID found.');
}
