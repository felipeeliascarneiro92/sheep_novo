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

function analyzeClientServices() {
    const clientId = '2726'; // OROS client ID

    console.log('Lendo servicos.csv...');
    const servicos = readCSV(path.join(csvDir, 'servicos.csv'));

    console.log('Lendo clientes_valores.csv...');
    const clientesValores = readCSV(path.join(csvDir, 'clientes_valores.csv'));

    // First, let's see what columns are available
    console.log('\n📋 Colunas em servicos.csv:');
    if (servicos.length > 0) {
        console.log(Object.keys(servicos[0]).join(', '));
    }

    console.log('\n📋 Colunas em clientes_valores.csv:');
    if (clientesValores.length > 0) {
        console.log(Object.keys(clientesValores[0]).join(', '));
    }

    // Search in clientes_valores for this client
    const clientValues = clientesValores.filter(cv => cv.id_cliente === clientId);

    console.log(`\n\n═══════════════════════════════════════`);
    console.log(`   SERVIÇOS DO CLIENTE OROS (ID: ${clientId})`);
    console.log(`═══════════════════════════════════════\n`);

    if (clientValues.length === 0) {
        console.log('❌ Nenhum serviço encontrado em clientes_valores.csv');
    } else {
        console.log(`✓ Encontrados ${clientValues.length} registros em clientes_valores.csv\n`);

        // Group by service and show details
        const serviceMap = new Map();

        clientValues.forEach(cv => {
            const serviceId = cv.id_servico;
            const service = servicos.find(s => s.id === serviceId);

            if (!serviceMap.has(serviceId)) {
                serviceMap.set(serviceId, {
                    id: serviceId,
                    nome: service ? service.nome : 'Desconhecido',
                    categoria: service ? service.categoria : 'N/A',
                    precoOriginal: service ? service.preco : 'N/A',
                    precoCliente: cv.preco || cv.valor || 'N/A',
                    count: 0,
                    details: service
                });
            }

            serviceMap.get(serviceId).count++;
        });

        console.log('─────────────────────────────────────');
        console.log('Serviços personalizados para este cliente:\n');

        let index = 1;
        serviceMap.forEach((info, serviceId) => {
            console.log(`${index}. ${info.nome}`);
            console.log(`   → ID: ${serviceId}`);
            console.log(`   → Categoria: ${info.categoria}`);
            console.log(`   → Preço Original: R$ ${info.precoOriginal}`);
            console.log(`   → Preço Cliente: R$ ${info.precoCliente}`);
            console.log('');
            index++;
        });

        // Save to JSON for detailed analysis
        const output = {
            clientId: clientId,
            clientName: 'OROS ADMINISTRADORA DE PARTICIPAÇÕES SOCIETÁRIAS LTDA',
            totalServices: serviceMap.size,
            services: Array.from(serviceMap.values())
        };

        fs.writeFileSync('oros_services.json', JSON.stringify(output, null, 2));
        console.log('✓ Análise salva em oros_services.json');
    }

    console.log('\n═══════════════════════════════════════\n');
}

analyzeClientServices();
