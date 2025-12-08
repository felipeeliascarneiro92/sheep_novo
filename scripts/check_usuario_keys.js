
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/usuario.csv');

function checkKeys() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    if (records.length > 0) {
        console.log('Keys in first record:', Object.keys(records[0]));
    }
}

checkKeys();
