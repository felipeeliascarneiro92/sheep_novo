
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/servicos.csv');

function parseLine() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    const header = lines[0];

    const line = lines.find(l => {
        const parts = l.split(';');
        const id = parts[0].replace(/"/g, '');
        return id === '47452';
    });

    if (line) {
        const records = parse(`${header}\n${line}`, {
            columns: true,
            delimiter: ';',
            relax_quotes: true
        });
        console.log('Parsed Record:', records[0]);
    } else {
        console.log('Line not found');
    }
}

parseLine();
