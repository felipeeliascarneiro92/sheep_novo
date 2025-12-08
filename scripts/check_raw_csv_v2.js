
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/servicos.csv');

function checkRawCSV() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');

    console.log('Total lines:', lines.length);

    // Find line containing "47452"
    const line = lines.find(l => l.includes('47452'));
    console.log('Line with 47452:', line);
}

checkRawCSV();
