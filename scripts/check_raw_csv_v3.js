
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../csv_antigos/servicos.csv');

function checkRawCSV() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');

    // Check for exact ID match at start
    const line = lines.find(l => {
        const parts = l.split(';');
        // Remove quotes if present
        const id = parts[0].replace(/"/g, '');
        return id === '47452';
    });

    console.log('Line found:', line);
}

checkRawCSV();
