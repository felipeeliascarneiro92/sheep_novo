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

function analyze() {
    console.log('Reading clientes.csv...');
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));

    // 1. Find clients with id_asaas
    const withAsaas = clientes.filter(c => c.id_asaas && c.id_asaas !== '\\N');

    // 2. Unique id_forma_pagamento
    const paymentMethods = new Set();
    clientes.forEach(c => paymentMethods.add(c.id_forma_pagamento));

    // 3. Check for text in id_forma_pagamento
    const textPaymentMethods = clientes.filter(c => isNaN(parseInt(c.id_forma_pagamento)) && c.id_forma_pagamento !== '\\N');
    if (textPaymentMethods.length > 0) {
        console.log('Found text payment methods:', textPaymentMethods.map(c => c.id_forma_pagamento).slice(0, 5));
    } else {
        console.log('All id_forma_pagamento are numeric or \\N');
    }

    // 4. CPF/CNPJ Analysis
    console.log('Analyzing CPF/CNPJ lengths...');
    let cpfCount = 0;
    let cnpjCount = 0;
    let otherCount = 0;

    clientes.slice(0, 100).forEach(c => {
        const doc = c.cpf_cnpj;
        if (!doc || doc === '\\N') return;
        const clean = doc.replace(/\D/g, '');
        if (clean.length <= 11) cpfCount++;
        else if (clean.length > 11) cnpjCount++;
        else otherCount++;
    });

    const output = {
        totalClients: clientes.length,
        clientsWithAsaas: withAsaas.length,
        exampleAsaasClient: withAsaas.length > 0 ? withAsaas[0] : null,
        uniquePaymentMethods: Array.from(paymentMethods),
        cpfCount,
        cnpjCount,
        otherCount
    };
    fs.writeFileSync('analysis.json', JSON.stringify(output, null, 2));
    console.log('Analysis written to analysis.json');
}

analyze();
