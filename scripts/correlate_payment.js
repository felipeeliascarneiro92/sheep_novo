import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvDir = path.join(process.cwd(), 'csv_antigos');

function readCSV(filePath) {
    const content = fs.readFileSync(filePath);
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true,
    });
}

function correlate() {
    console.log('Reading CSVs...');
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));
    const contas = readCSV(path.join(csvDir, 'contas_receber.csv'));

    const clientPaymentId = {};
    clientes.forEach(c => {
        clientPaymentId[c.id] = c.id_forma_pagamento;
    });

    const correlation = {}; // id_forma_pagamento -> { TYPE: count }

    contas.forEach(conta => {
        const clientId = conta.id_cliente;
        const paymentId = clientPaymentId[clientId];
        const type = conta.billingtype;

        if (paymentId && type) {
            if (!correlation[paymentId]) correlation[paymentId] = {};
            if (!correlation[paymentId][type]) correlation[paymentId][type] = 0;
            correlation[paymentId][type]++;
        }
    });

    fs.writeFileSync('correlation.json', JSON.stringify(correlation, null, 2));
    console.log('Correlation written to correlation.json');
}

correlate();
