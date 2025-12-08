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

function investigateServices() {
    const clientId = '2726'; // OROS client ID

    console.log('Lendo clientes_valores.csv...');
    const clientesValores = readCSV(path.join(csvDir, 'clientes_valores.csv'));

    console.log('Lendo servicos.csv...');
    const servicos = readCSV(path.join(csvDir, 'servicos.csv'));

    // Get client values
    const clientValues = clientesValores.filter(cv => cv.id_cliente === clientId);

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  INVESTIGAÇÃO - CLIENTE OROS (ID: ${clientId})`);
    console.log(`═══════════════════════════════════════\n`);

    console.log(`Total de registros em clientes_valores: ${clientValues.length}\n`);

    if (clientValues.length > 0) {
        console.log('📋 Primeiro registro completo:');
        console.log(JSON.stringify(clientValues[0], null, 2));

        // Try to find the service
        const serviceId = clientValues[0].id_servico;
        console.log(`\n🔍 Procurando serviço ID: ${serviceId} em servicos.csv...`);

        const service = servicos.find(s => s.id === serviceId);

        if (service) {
            console.log('✓ Serviço encontrado:');
            console.log(JSON.stringify(service, null, 2));
        } else {
            console.log(`❌ Serviço com ID ${serviceId} NÃO encontrado em servicos.csv`);

            // Let's check the first few services to understand the structure
            console.log('\n📋 Primeiros 3 serviços em servicos.csv (para referência):');
            servicos.slice(0, 3).forEach((s, idx) => {
                console.log(`\nServiço ${idx + 1}:`);
                console.log(JSON.stringify(s, null, 2));
            });
        }

        // Check all unique service IDs for this client
        const uniqueServiceIds = [...new Set(clientValues.map(cv => cv.id_servico))];
        console.log(`\n📊 IDs de serviços únicos para este cliente: ${uniqueServiceIds.join(', ')}`);

        // Summary
        const summary = {
            clientId: clientId,
            totalRecords: clientValues.length,
            uniqueServices: uniqueServiceIds.length,
            serviceIds: uniqueServiceIds,
            sampleRecord: clientValues[0],
            foundInServicosCSV: servicos.some(s => uniqueServiceIds.includes(s.id))
        };

        fs.writeFileSync('oros_services_investigation.json', JSON.stringify(summary, null, 2));
        console.log('\n✓ Investigação salva em oros_services_investigation.json');
    }
}

investigateServices();
