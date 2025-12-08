import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
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

function analyzeEmails() {
    console.log('📂 Lendo arquivos CSV...');

    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));
    const usuarios = readCSV(path.join(csvDir, 'usuario.csv'));

    // Extrair e normalizar emails
    const extractEmails = (records, sourceName) => {
        const emails = new Set();
        let total = 0;
        let empty = 0;

        records.forEach(r => {
            total++;
            if (r.email && r.email !== '\\N' && r.email.trim() !== '') {
                // Pode haver múltiplos emails separados por vírgula ou ponto e vírgula
                const parts = r.email.split(/[,;]/);
                parts.forEach(p => {
                    const clean = p.trim().toLowerCase();
                    if (clean) emails.add(clean);
                });
            } else {
                empty++;
            }
        });

        return { set: emails, totalRecords: total, emptyRecords: empty };
    };

    const clientEmails = extractEmails(clientes, 'Clientes');
    const userEmails = extractEmails(usuarios, 'Usuários');

    console.log('\n📊 ANÁLISE DE E-MAILS');
    console.log('═══════════════════════════════════════════════════════');

    console.log(`🏢 CLIENTES (Imobiliárias):`);
    console.log(`   - Total de registros: ${clientEmails.totalRecords}`);
    console.log(`   - Registros sem e-mail: ${clientEmails.emptyRecords}`);
    console.log(`   - E-mails únicos encontrados: ${clientEmails.set.size}`);

    console.log(`\n👤 USUÁRIOS (Corretores):`);
    console.log(`   - Total de registros: ${userEmails.totalRecords}`);
    console.log(`   - Registros sem e-mail: ${userEmails.emptyRecords}`);
    console.log(`   - E-mails únicos encontrados: ${userEmails.set.size}`);

    // Comparação
    let intersection = 0;
    let uniqueToClients = 0;
    let uniqueToUsers = 0;

    clientEmails.set.forEach(email => {
        if (userEmails.set.has(email)) {
            intersection++;
        } else {
            uniqueToClients++;
        }
    });

    userEmails.set.forEach(email => {
        if (!clientEmails.set.has(email)) {
            uniqueToUsers++;
        }
    });

    console.log('\n🔄 COMPARAÇÃO (Sobreposição):');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🔗 E-mails IGUAIS em ambas as tabelas: ${intersection}`);
    console.log(`   (Estes são corretores usando o mesmo e-mail da imobiliária)`);

    console.log(`\n🏢 Apenas em Clientes: ${uniqueToClients}`);
    console.log(`👤 Apenas em Usuários: ${uniqueToUsers}`);

    const totalUnique = clientEmails.set.size + uniqueToUsers;
    console.log(`\n📧 Total de e-mails únicos no sistema todo: ${totalUnique}`);
    console.log('═══════════════════════════════════════════════════════\n');
}

analyzeEmails();
