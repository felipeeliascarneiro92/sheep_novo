import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { execSync } from 'child_process';
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

function migrateBatchClients() {
    console.log('📂 Lendo arquivo de clientes...');
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));

    if (clientes.length === 0) {
        console.log('❌ Arquivo vazio.');
        return;
    }

    console.log(`📊 Total de clientes no CSV: ${clientes.length}`);

    // Selecionar os 10 últimos clientes para o teste
    // (Pode ajustar para pegar do início se preferir: clientes.slice(0, 10))
    const batchSize = 10;
    const startIndex = Math.max(0, clientes.length - batchSize);
    const clientsToMigrate = clientes.slice(startIndex);

    console.log(`🚀 Iniciando migração de ${clientsToMigrate.length} clientes (dos últimos registros)...\n`);

    let successCount = 0;
    let errorCount = 0;

    clientsToMigrate.forEach((client, index) => {
        console.log(`\n[${index + 1}/${batchSize}] Processando Cliente ID: ${client.id} - ${client.nome}...`);

        try {
            // Executa o script de migração individual para cada cliente
            execSync(`node scripts/migrate_single_client.js ${client.id}`, {
                stdio: 'inherit', // Mostra o output do script filho
                cwd: process.cwd()
            });
            successCount++;
        } catch (error) {
            console.error(`❌ Erro ao migrar cliente ${client.id}:`, error.message);
            errorCount++;
        }
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  RESUMO DA MIGRAÇÃO EM LOTE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`❌ Falhas: ${errorCount}`);
    console.log('═══════════════════════════════════════════════════════\n');
}

migrateBatchClients();
