
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvPath = path.join(process.cwd(), 'csv_antigos', 'servicos.csv');
const content = fs.readFileSync(csvPath, 'utf-8');
const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_quotes: true
});

const statusCounts = {};
records.forEach(r => {
    const s = r.status;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
});

console.log('Status codes found in servicos.csv:', statusCounts);
