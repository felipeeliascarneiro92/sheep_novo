import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const csvDir = path.join(process.cwd(), 'csv_antigos');

function readCSV(filePath) {
    return parse(fs.readFileSync(filePath), {
        console.log('Total Usuarios (registros):', usuarios.length);
        console.log('Total Emails Unicos Usuarios:', uEmails.size);
        console.log('INTERSECAO (Iguais):', intersection);
        console.log('Apenas em Clientes:', cEmails.size - intersection);
        console.log('Apenas em Usuarios:', uEmails.size - intersection);
