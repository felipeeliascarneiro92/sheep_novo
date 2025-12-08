
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

// Helper to find items for a booking
function getItemsForBooking(bookingId) {
    return items.filter(i => i.id_servico === bookingId).map(i => i.id_tipo_servico);
}

// Find examples
const examples = {};
const keywords = ['Vídeo', 'Drone', 'Chaves', 'Planta', 'Tour'];

report.forEach(r => {
    const name = r.servicos;
    if (!name) return;

    keywords.forEach(k => {
        if (name.includes(k) && !examples[k]) {
            const bookingId = r.Id;
            const itemTypes = getItemsForBooking(bookingId);
            examples[k] = {
                serviceName: name,
                bookingId: bookingId,
                itemTypes: itemTypes
            };
        }
    });
});

fs.writeFileSync('service_examples.txt', JSON.stringify(examples, null, 2));
console.log('Examples written to service_examples.txt');
