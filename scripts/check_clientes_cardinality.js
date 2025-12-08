
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/clientes.csv');

function checkCardinality() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true
    });

    console.log(`Total records in clientes.csv: ${records.length}`);

    const groupCounts = {};
    records.forEach(r => {
        const gid = r.id_grupo;
        if (gid && gid !== '\\N') {
            groupCounts[gid] = (groupCounts[gid] || 0) + 1;
        }
    });

    const multi = Object.entries(groupCounts).filter(([k, v]) => v > 1);
    console.log(`Groups with multiple client records: ${multi.length}`);

    if (multi.length > 0) {
        console.log('Sample multi-record groups:', multi.slice(0, 5));
    }
}

checkCardinality();
