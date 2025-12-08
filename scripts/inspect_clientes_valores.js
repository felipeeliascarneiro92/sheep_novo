
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvPath = path.join(process.cwd(), 'csv_antigos', 'clientes_valores.csv');
const content = fs.readFileSync(csvPath, 'utf-8');
const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_quotes: true,
    to: 1
});

if (records.length > 0) {
    console.log('Columns:', JSON.stringify(Object.keys(records[0]), null, 2));
    console.log('First Record:', records[0]);
} else {
    console.log('No records found');
}
