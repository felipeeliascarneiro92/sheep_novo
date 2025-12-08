import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), 'csv_antigos', 'relatorio_agendamentos.csv');

try {
    const buffer = fs.readFileSync(csvPath);
    console.log('Buffer length:', buffer.length);
    console.log('First 20 bytes:', buffer.subarray(0, 20));

    // Tentar detectar UTF-16LE (BOM: FF FE)
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        console.log('Detectado UTF-16LE');
        const content = buffer.toString('utf16le');
        console.log('Conteúdo (primeiros 100 chars):', content.substring(0, 100));
    } else {
        console.log('Assumindo UTF-8 ou ANSI');
        const content = buffer.toString('utf8');
        console.log('Conteúdo (primeiros 100 chars):', content.substring(0, 100));

        if (content.includes('')) {
            console.log('⚠️ Caracteres estranhos detectados, pode ser encoding incorreto (ANSI/Windows-1252?)');
        }
    }
} catch (e) {
    console.error('Erro:', e);
}
