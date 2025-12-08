import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const csvPath = path.join(process.cwd(), 'csv_antigos', 'clientes.csv');
const content = fs.readFileSync(csvPath);
const records = parse(content, {
    columns: true, skip_empty_lines: true, delimiter: ';', relax_quotes: true
});

console.log('--- COLUNAS CLIENTES.CSV ---');
Object.keys(records[0]).forEach(k => console.log(k));
