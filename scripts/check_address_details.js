
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/endereco.csv');

function checkAddress() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    console.log('Header:', lines[0]);

    const records = parse(content, {
        columns: true,
        delimiter: ';',
        relax_quotes: true
    });

    const addr = records.find(r => r.id === '80471');
    console.log('Address 80471 Details:');
    console.log(' - logradouro:', addr.logradouro);
    console.log(' - numero:', addr.numero); // Check if this column exists
    console.log(' - bairro:', addr.bairro);
    console.log(' - cidade:', addr.cidade);
}

checkAddress();
