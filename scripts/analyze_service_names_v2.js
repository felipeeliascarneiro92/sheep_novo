
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvPath = path.join(process.cwd(), 'csv_antigos', 'relatorio_agendamentos.csv');
const content = fs.readFileSync(csvPath, 'utf-8');
const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
    relax_quotes: true
});

const serviceCounts = {};
records.forEach(r => {
    const s = r.servicos;
    if (s) {
        serviceCounts[s] = (serviceCounts[s] || 0) + 1;
    }
});

const sortedServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .slice(0, 20); // Top 20

console.log('Top 20 Service Names in Report:', JSON.stringify(sortedServices, null, 2));
