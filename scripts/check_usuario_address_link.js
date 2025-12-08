
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/usuario.csv');

function checkUsuarioAddress() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    console.log('Checking first 5 records for id_endereco:');
    records.slice(0, 5).forEach(r => {
        console.log(`ID: ${r.id}, Name: ${r.nome}, Address ID: ${r.id_endereco}`);
    });
}

checkUsuarioAddress();
