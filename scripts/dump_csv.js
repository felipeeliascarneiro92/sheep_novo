import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), 'csv_antigos', 'relatorio_agendamentos.csv');
const buffer = fs.readFileSync(csvPath);

console.log('--- Lendo como UTF-8 ---');
console.log(buffer.toString('utf8'));

console.log('\n--- Lendo como Latin1 (Binary) ---');
console.log(buffer.toString('latin1'));
