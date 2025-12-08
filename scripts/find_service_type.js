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

function findServiceDetails() {
    const clientId = '2726';
    const tipoServicoId = '6';

    console.log('Lendo servicos.csv...');
    const servicos = readCSV(path.join(csvDir, 'servicos.csv'));

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  SERVIÇOS DO CLIENTE OROS`);
    console.log(`═══════════════════════════════════════\n`);

    // Search for services with tipo = 6
    const matchingServices = servicos.filter(s => s.tipo === tipoServicoId || s.id_tipo === tipoServicoId || s.id_tipo_servico === tipoServicoId);

    console.log(`🔍 Procurando serviços com tipo/categoria = ${tipoServicoId}...\n`);

    if (matchingServices.length > 0) {
        console.log(`✓ Encontrados ${matchingServices.length} serviços:\n`);
        matchingServices.forEach((s, idx) => {
            console.log(`${idx + 1}. ${s.nome || 'Sem nome'}`);
            console.log(`   ID: ${s.id}`);
            console.log(`   Preço padrão: R$ ${s.preco || s.valor || 'N/A'}`);
            console.log('');
        });
    } else {
        console.log(`❌ Nenhum serviço encontrado com tipo ${tipoServicoId}`);
        console.log('\n📋 Vamos ver a estrutura de um serviço:');
        if (servicos.length > 0) {
            console.log('Colunas disponíveis:', Object.keys(servicos[0]).join(', '));
            console.log('\nPrimeiro serviço como exemplo:');
            console.log(JSON.stringify(servicos[0], null, 2));
        }
    }

    console.log('\n─────────────────────────────────────');
    console.log('RESUMO:');
    console.log(`→ Cliente OROS tem 17 registros de preços personalizados`);
    console.log(`→ Todos são do tipo de serviço: ${tipoServicoId}`);
    console.log(`→ Valor personalizado: R$ 95,00`);
    console.log('═══════════════════════════════════════\n');

    const summary = {
        clientId: clientId,
        tipoServicoId: tipoServicoId,
        totalRecords: 17,
        customPrice: '95,00',
        matchingServices: matchingServices.map(s => ({
            id: s.id,
            nome: s.nome,
            preco: s.preco || s.valor
        }))
    };

    fs.writeFileSync('oros_final_analysis.json', JSON.stringify(summary, null, 2));
    console.log('✓ Análise salva em oros_final_analysis.json\n');
}

findServiceDetails();
