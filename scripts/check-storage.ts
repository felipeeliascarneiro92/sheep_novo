import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBucketContents() {
    console.log('🔍 Verificando bucket public-assets...\n');

    try {
        // List root
        const { data: rootFiles, error: rootError } = await supabase.storage
            .from('public-assets')
            .list('', { limit: 100 });

        if (rootError) {
            console.error('❌ Erro ao listar raiz:', rootError);
            return;
        }

        console.log('📁 RAIZ (public-assets/):');
        console.log(`   Total de itens: ${rootFiles?.length || 0}`);
        rootFiles?.forEach(file => {
            const type = file.id ? '📄' : '📁';
            console.log(`   ${type} ${file.name}`);
        });
        console.log('');

        // List logo folder
        const { data: logoFiles, error: logoError } = await supabase.storage
            .from('public-assets')
            .list('logo', { limit: 100 });

        if (!logoError && logoFiles) {
            console.log('📁 PASTA logo/ :');
            console.log(`   Total de arquivos: ${logoFiles.length}`);
            logoFiles.forEach(file => {
                console.log(`   📄 ${file.name}`);
                const { data: { publicUrl } } = supabase.storage
                    .from('public-assets')
                    .getPublicUrl(`logo/${file.name}`);
                console.log(`      URL: ${publicUrl}`);
            });
            console.log('');
        }

        // List portfolio folder
        const { data: portfolioFiles, error: portfolioError } = await supabase.storage
            .from('public-assets')
            .list('portfolio', { limit: 100 });

        if (!portfolioError && portfolioFiles) {
            console.log('📁 PASTA portfolio/ :');
            console.log(`   Total de arquivos: ${portfolioFiles.length}`);
            portfolioFiles.forEach(file => {
                console.log(`   📄 ${file.name}`);
            });
            console.log('');
        }

        // Test bucket configuration
        console.log('🔧 Testando configuração do bucket...');
        const { data: buckets } = await supabase.storage.listBuckets();
        const publicAssets = buckets?.find(b => b.name === 'public-assets');

        if (publicAssets) {
            console.log('✅ Bucket "public-assets" encontrado');
            console.log(`   Público: ${publicAssets.public ? '✅ SIM' : '❌ NÃO (PROBLEMA!)'}`);
        } else {
            console.log('❌ Bucket "public-assets" NÃO encontrado!');
        }

    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

listBucketContents();
