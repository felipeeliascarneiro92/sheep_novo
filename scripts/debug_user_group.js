import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const csvDir = path.join(process.cwd(), 'csv_antigos');

function readCSV(filePath) {
    return parse(fs.readFileSync(filePath), {
        columns: true, skip_empty_lines: true, delimiter: ';', relax_quotes: true
    });
}

const userId = '2474'; // O ID do corretor que importamos

console.log(`🔍 Investigando Usuário ID: ${userId}`);

const usuarios = readCSV(path.join(csvDir, 'usuario.csv'));
const user = usuarios.find(u => u.id === userId);

if (!user) {
    console.log('❌ Usuário não encontrado no CSV.');
} else {
    console.log('👤 Dados do Usuário (CSV):');
    console.log(`   Nome: ${user.nome}`);
    console.log(`   ID Grupo: ${user.id_grupo}`);

    const groupId = user.id_grupo;

    console.log(`\n🔍 Buscando Grupo ID: ${groupId} em clientes.csv...`);
    const clientes = readCSV(path.join(csvDir, 'clientes.csv'));
    const cliente = clientes.find(c => c.id === groupId);

    if (cliente) {
        console.log('🏢 Dados do Cliente (Imobiliária) no CSV:');
        console.log(`   ID: ${cliente.id}`);
        console.log(`   Nome: ${cliente.nome}`);
        console.log(`   Nome Fantasia: ${cliente.nome_fantasia}`);
    } else {
        console.log('❌ Cliente não encontrado em clientes.csv com esse ID.');
    }

    console.log(`\n🔍 Buscando Grupo ID: ${groupId} em grupo.csv (caso seja outra tabela)...`);
    const grupos = readCSV(path.join(csvDir, 'grupo.csv'));
    const grupo = grupos.find(g => g.id === groupId);

    console.log(`\n🔍 Buscando Cliente em clientes.csv que tenha id_grupo = ${groupId}...`);
    const clienteDoGrupo = clientes.find(c => c.id_grupo === groupId);

    if (clienteDoGrupo) {
        console.log('✅ Cliente encontrado pelo id_grupo:');
        console.log(`   ID: ${clienteDoGrupo.id}`);
        console.log(`   Nome: ${clienteDoGrupo.nome}`);
        console.log(`   Nome Fantasia: ${clienteDoGrupo.nome_fantasia}`);
    } else {
        console.log('❌ Nenhum cliente encontrado com esse id_grupo.');
    }
}
