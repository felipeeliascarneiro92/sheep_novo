
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/endereco.csv');

function checkAddress() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
        columns: true,
        delimiter: ';',
        relax_quotes: true
    });

    const addr = records.find(r => r.id === '80471');
    console.log('Address 80471:', addr);
}

checkAddress();
