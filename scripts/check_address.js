import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

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

function checkAddress() {
    console.log('Reading endereco.csv...');
    const enderecos = readCSV(path.join(csvDir, 'endereco.csv'));
    const address = enderecos.find(a => a.id === '4031');
    if (address) {
        console.log('Telefone:', address.telefone);
        console.log('Celular:', address.celular);
        console.log('Email:', address.email);
    } else {
        console.log('Address not found');
    }
}

checkAddress();
