import fs from 'fs';
import path from 'path';

const logPath = path.join(process.cwd(), 'migrate_all_brokers_log.txt');
const content = fs.readFileSync(logPath, 'utf8'); // Tentar utf8
const lines = content.split('\n');
const lastLines = lines.slice(-15); // Pegar últimas 15 linhas

console.log(lastLines.join('\n'));
