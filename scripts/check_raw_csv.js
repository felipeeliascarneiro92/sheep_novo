
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/servicos.csv');

function checkRawCSV() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');

    // Header
    console.log('Header:', lines[0]);

    // Find line starting with "47452;"
    const line = lines.find(l => l.startsWith('47452;'));
    console.log('Line 47452:', line);
}

checkRawCSV();
