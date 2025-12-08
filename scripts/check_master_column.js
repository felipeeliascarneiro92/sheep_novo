import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const csvDir = path.join(process.cwd(), 'csv_antigos');

const content = fs.readFileSync(path.join(csvDir, 'usuario.csv'));
const records = parse(content, {
    columns: true, skip_empty_lines: true, delimiter: ';', relax_quotes: true
});

// Identificar a 19ª coluna (índice 18)
const keys = Object.keys(records[0]);
const colIndex = 18; // 19ª coluna
const colName = keys[colIndex];

console.log(`🔍 Coluna 19 identificada como: "${colName}"`);

if (!colName) {
    console.log('❌ O arquivo tem menos de 19 colunas.');
} else {
    const counts = {};
    records.forEach(r => {
        const val = r[colName];
        counts[val] = (counts[val] || 0) + 1;
    });

    console.log(`\n📊 Contagem de valores na coluna "${colName}":`);
    console.table(counts);
}
