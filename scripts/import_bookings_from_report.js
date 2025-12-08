import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://izrquzkspbflnlgcyccl.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cnF1emtzcGJmbG5sZ2N5Y2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3OTc5NzUsImV4cCI6MjA0NzM3Mzk3NX0.cKL5l1qNIIZUQjPzfCEaHhNEW-KFkr8B6xAGSGsEf88';

console.log(`📡 Conectando ao Supabase...`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const statusMap = {
    '1': 'Confirmado',
    '7': 'Realizado',
    'confirmado': 'Confirmado',
    'realizado': 'Realizado',
    'concluido': 'Concluído',
    'cancelado': 'Cancelado',
    'pendente': 'Pendente'
};

function mapStatus(statusCode) {
    if (!statusCode) return 'Pendente';
    const mapped = statusMap[statusCode] || statusMap[statusCode.toLowerCase()];
    return mapped || 'Pendente';
}

async function findClient(csvClientName) {
    console.log(`🔍 Buscando cliente no banco para: "${csvClientName}"...`);
    let { data } = await supabase.from('clients').select('id, name').eq('name', csvClientName).limit(1);
    if (data?.length) return data[0];

    const searchTerm = csvClientName.split(' ')[0];
    console.log(`   Busca exata falhou. Tentando parcial por "${searchTerm}"...`);
    ({ data } = await supabase.from('clients').select('id, name').ilike('name', `%${searchTerm}%`).limit(5));

    if (!data?.length) return null;

    const targetName = "OROS ADMINISTRADORA DE PARTICIPAÇÕES SOCIETÁRIAS LTDA";
    return data.find(c => c.name.toUpperCase() === targetName) || data[0];
}

async function findPhotographer(name) {
    if (!name) return null;
    const { data } = await supabase.from('photographers').select('id, name').ilike('name', `%${name}%`).limit(1);
    return data?.[0] || null;
}

async function findServices(serviceString) {
    if (!serviceString) return [];
    const names = serviceString.split(',').map(s => s.trim());
    const ids = [];
    for (const name of names) {
        const { data } = await supabase.from('services').select('id').ilike('name', `%${name}%`).limit(1);
        if (data?.[0]) ids.push(data[0].id);
    }
    return ids;
}

// Função auxiliar para encontrar valor ignorando case das chaves
function getValue(record, keyPart) {
    // Tenta encontrar chave exata primeiro
    if (record[keyPart]) return record[keyPart];

    // Procura case-insensitive
    const key = Object.keys(record).find(k => k.toLowerCase() === keyPart.toLowerCase());
    if (key) return record[key];

    // Procura parcial
    const keyPartial = Object.keys(record).find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
    return keyPartial ? record[keyPartial] : undefined;
}

async function importSingleBooking() {
    const csvPath = path.join(process.cwd(), 'csv_antigos', 'relatorio_agendamentos.csv');
    console.log('📄 Lendo arquivo CSV...');

    const buffer = fs.readFileSync(csvPath);
    let csvContent = buffer.toString('utf8');

    // Detecção simples de encoding ruim
    if (csvContent.includes('Ã') || csvContent.includes('')) {
        console.log('⚠️ Detectado provável encoding ANSI/Latin1. Tentando decodificar...');
        csvContent = buffer.toString('latin1');
    }

    csvContent = csvContent.replace(/^\uFEFF/, ''); // Remove BOM

    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        relax_quotes: true,
        trim: true
    });

    console.log(`📊 Total de registros: ${records.length}`);
    if (records.length > 0) {
        console.log('📋 Chaves detectadas:', Object.keys(records[0]));
    }

    // Filtrar OROS
    const orosRecords = records.filter(r => {
        // AJUSTE CRÍTICO: Usando 'name' (do CSV) ou 'imobiliaria'
        const clientName = r['name'] || r['Imobiliaria'] || getValue(r, 'name') || getValue(r, 'imobiliaria');
        return clientName && clientName.toLowerCase().includes('oros');
    });

    if (orosRecords.length === 0) {
        console.log('⚠️ Nenhum registro da OROS encontrado.');
        return;
    }

    console.log(`✓ Encontrados ${orosRecords.length} registros da OROS.`);
    const record = orosRecords[0];

    // Mapeamento corrigido baseado no dump do arquivo
    const clientName = record['name'] || getValue(record, 'name');
    const brokerName = record['broker'] || getValue(record, 'broker');
    const photographerName = getValue(record, 'fotografo');
    const servicesStr = getValue(record, 'servicos');
    const dateStr = getValue(record, 'data prevista') || getValue(record, 'data');
    const timeStr = getValue(record, 'hora prevista') || getValue(record, 'hora');
    const addressStr = getValue(record, 'endereço') || getValue(record, 'endereco');
    const valueStr = getValue(record, 'valor');
    const providerValueStr = getValue(record, 'fornecedor');
    const statusStr = getValue(record, 'status');
    const notesStr = getValue(record, 'complemento');
    const linkStr = getValue(record, 'link imagens');
    const acompStr = getValue(record, 'acompanhamento');

    console.log('📋 Dados extraídos:', {
        clientName, brokerName, photographerName, servicesStr, dateStr
    });

    const client = await findClient(clientName);
    if (!client) {
        console.error('❌ Cliente não encontrado no Supabase.');
        return;
    }
    console.log(`✅ Cliente: ${client.name}`);

    const photographer = await findPhotographer(photographerName);
    const serviceIds = await findServices(servicesStr);

    const booking = {
        client_id: client.id,
        client_name: client.name,
        photographer_id: photographer?.id || null,
        service_ids: serviceIds,
        date: dateStr,
        start_time: timeStr?.substring(0, 5),
        address: addressStr,
        total_price: parseFloat(valueStr || 0),
        photographer_payout: parseFloat(providerValueStr || 0),
        status: mapStatus(statusStr),
        notes: notesStr,
        dropbox_folder_link: linkStr,
        is_accompanied: acompStr === '1',
        accompanying_broker_name: acompStr === '1' ? brokerName : null,
        created_at: new Date().toISOString(),
        history: [{
            timestamp: new Date().toISOString(),
            actor: 'Sistema',
            notes: `Importado via script de teste. ID Original: ${record['Id']}`
        }]
    };

    console.log('\n💾 Salvando booking...');
    const { data, error } = await supabase.from('bookings').insert([booking]).select();

    if (error) console.error('❌ Erro:', error.message);
    else console.log(`✅ Sucesso! ID: ${data[0].id}`);
}

importSingleBooking();
