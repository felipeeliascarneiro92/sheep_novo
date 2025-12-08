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

function checkClient() {
    console.log('Reading CSVs...');
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));
    const enderecos = readCSV(path.join(csvDir, 'endereco.csv'));

    const client = clientes.find(c => c.id === '2742');
    console.log('\nCliente 2742:');
    console.log(JSON.stringify(client, null, 2));

    if (client && client.id_endereco) {
        const address = enderecos.find(a => a.id === client.id_endereco);
        console.log('\nEndereço (id_endereco=' + client.id_endereco + '):');
        console.log(JSON.stringify(address, null, 2));
    }
}

checkClient();
