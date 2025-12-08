
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvDir = path.join(process.cwd(), 'csv_antigos');

function readCSV(filename) {
    const content = fs.readFileSync(path.join(csvDir, filename), 'utf-8');
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: filename === 'relatorio_agendamentos.csv' ? ',' : ';',
        relax_quotes: true
    });
}

const report = readCSV('relatorio_agendamentos.csv');
const items = readCSV('servicos_itens.csv');

// Map Report ID to Service Name
const reportMap = {};
report.forEach(r => {
    reportMap[r.Id] = r.servicos;
});

// Count occurrences of id_tipo_servico for each service name found in report
const mapping = {};

const typeCounts = {};
items.forEach(item => {
    const bookingId = item.id_servico;
    const serviceName = reportMap[bookingId];
    const typeId = item.id_tipo_servico;

    if (typeId) {
        typeCounts[typeId] = (typeCounts[typeId] || 0) + 1;
    }

    if (serviceName && typeId) {
        if (!mapping[typeId]) {
            mapping[typeId] = {};
        }
        mapping[typeId][serviceName] = (mapping[typeId][serviceName] || 0) + 1;
    }
});

const finalMapping = {};
Object.keys(typeCounts).forEach(typeId => {
    const names = mapping[typeId] || {};
    const topNameEntry = Object.entries(names).sort((a, b) => b[1] - a[1])[0];
    const topName = topNameEntry ? topNameEntry[0] : 'Unknown';
    finalMapping[typeId] = {
        count: typeCounts[typeId],
        likelyName: topName
    };
});



fs.writeFileSync('inferred_mapping.txt', JSON.stringify(finalMapping, null, 2));
console.log('Mapping written to inferred_mapping.txt');
