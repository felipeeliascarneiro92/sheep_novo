
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvDir = path.join(process.cwd(), 'csv_antigos');
const content = fs.readFileSync(path.join(csvDir, 'clientes_valores.csv'), 'utf-8');
const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_quotes: true
});

const priceStats = {};

records.forEach(r => {
    const typeId = r.id_tipo_servico;
    const price = parseFloat(r.valor.replace(',', '.'));

    if (!priceStats[typeId]) {
        priceStats[typeId] = { count: 0, sum: 0, min: price, max: price };
    }

    priceStats[typeId].count++;
    priceStats[typeId].sum += price;
    priceStats[typeId].min = Math.min(priceStats[typeId].min, price);
    priceStats[typeId].max = Math.max(priceStats[typeId].max, price);
});

const summary = {};
Object.keys(priceStats).forEach(id => {
    const s = priceStats[id];
    summary[id] = {
        count: s.count,
        avg: (s.sum / s.count).toFixed(2),
        range: `${s.min} - ${s.max}`
    };
});

console.log('Price Stats by Service Type:', JSON.stringify(summary, null, 2));
