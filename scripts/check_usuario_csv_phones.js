
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/usuario.csv');

function checkUsuarioCSV() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    console.log('Header:', lines[0]);

    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    console.log('First 5 records:');
    records.slice(0, 5).forEach(r => {
        console.log(`ID: ${r.id}, Nome: ${r.nome}, Celular: ${r.celular}, Telefone: ${r.telefone}`);
    });
}

checkUsuarioCSV();
