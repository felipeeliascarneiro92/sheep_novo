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

function migratePenultimateClient() {
    console.log('📂 Lendo arquivo de clientes...');
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));

    if (clientes.length < 2) {
        console.log('❌ Não há clientes suficientes no arquivo para pegar o penúltimo.');
        return;
    }

    // Pegar o penúltimo (length - 2)
    const penultimateClient = clientes[clientes.length - 2];

    console.log('\n👤 Penúltimo cliente encontrado:');
    console.log(`   ID: ${penultimateClient.id}`);
    console.log(`   Nome: ${penultimateClient.nome}`);
    console.log(`   Email: ${penultimateClient.email}`);
    console.log(`   Cidade: ${penultimateClient.cidade}/${penultimateClient.estado}`);
    console.log('--------------------------------------------------');

    console.log(`\n🚀 Iniciando migração do cliente ID ${penultimateClient.id}...`);

    try {
        // Executa o script de migração individual existente
        execSync(`node scripts/migrate_single_client.js ${penultimateClient.id}`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        console.log('\n✅ Processo finalizado.');
    } catch (error) {
        console.error('\n❌ Erro ao executar a migração:', error.message);
    }
}

migratePenultimateClient();
