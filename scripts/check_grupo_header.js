
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/grupo.csv');

function checkHeader() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    console.log('Header:', lines[0]);
}

checkHeader();
