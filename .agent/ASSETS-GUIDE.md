# Guia de Assets - Página de Login Moderna

## 📁 Estrutura de Pastas no Supabase Storage

### Bucket: `public-assets`

```
public-assets/
├── logo/
│   └── sheep_house_logo.png       # Logo principal da empresa
└── portfolio/
    ├── casa-luxo-01.jpg          # Foto de imóvel de luxo
    ├── casa-luxo-02.jpg          # Foto de imóvel de luxo
    ├── casa-luxo-03.jpg          # Foto de imóvel de luxo
    ├── casa-luxo-04.jpg          # Foto de imóvel de luxo
    ├── casa-luxo-05.jpg          # E assim por diante...
    └── ...
```

## 🛠️ Como Configurar o Bucket no Supabase

### 1. Criar o Bucket

1. Acesse o **Supabase Dashboard**
2. Vá em **Storage** > **Create a new bucket**
3. Nome do bucket: `public-assets`
4. **✅ Marque como PUBLIC**
5. Clique em **Create bucket**

### 2. Configurar Políticas de Acesso (RLS)

Execute no SQL Editor do Supabase:

```sql
-- Política para permitir leitura pública
CREATE POLICY "Public can view assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-assets');

-- Política para upload (somente autenticados/admin)
CREATE POLICY "Authenticated users can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets');

-- Política para deletar (somente autenticados/admin)
CREATE POLICY "Authenticated users can delete their assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-assets');
```

### 3. Fazer Upload dos Assets

#### Opção A: Via Dashboard (Mais Fácil)

1. No Supabase Dashboard > Storage > `public-assets`
2. Crie a pasta `logo`
3. Dentro de `logo`, faça upload do `sheep_house_logo.png`
4. Crie a pasta `portfolio`
5. Dentro de `portfolio`, faça upload de suas fotos de imóveis

#### Opção B: Via Script (Para muitas imagens)

Você pode usar um script para fazer upload em massa. Exemplo:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SERVICE_KEY');

async function uploadPortfolioImages() {
    const imagesDir = './portfolio-images'; // Pasta local com suas imagens
    const files = fs.readdirSync(imagesDir);
    
    for (const file of files) {
        const filePath = path.join(imagesDir, file);
        const fileBuffer = fs.readFileSync(filePath);
        
        const { data, error } = await supabase.storage
            .from('public-assets')
            .upload(`portfolio/${file}`, fileBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });
            
        if (error) {
            console.error(`Erro no upload de ${file}:`, error);
        } else {
            console.log(`✅ Upload OK: ${file}`);
        }
    }
}

uploadPortfolioImages();
```

## 📸 Especificações das Imagens

### Logo (`logo/sheep_house_logo.png`)

- **Formato**: PNG (com transparência)
- **Dimensões Recomendadas**: 400x100px (ou proporção 4:1)
- **Tamanho**: < 200KB
- **Fundo**: Transparente

### Fotos do Portfólio (`portfolio/*.jpg`)

- **Formato**: JPG ou WebP
- **Dimensões Mínimas**: 1920x1080px (Full HD)
- **Dimensões Ideais**: 2560x1440px (2K) ou maior
- **Aspect Ratio**: 16:9 ou 3:2
- **Qualidade**: 85-90% (balanceio entre qualidade e tamanho)
- **Tamanho**: < 500KB por imagem (use compressão)
- **Orientação**: Landscape (horizontal)

### Dicas para Fotos

✅ **Escolha fotos que mostrem:**
- Fachadas de imóveis de luxo
- Interiores bem iluminados
- Detalhes arquitetônicos
- Variedade (casa, apartamento, área externa, etc.)

✅ **Evite:**
- Fotos escuras ou mal iluminadas
- Imagens borradas
- Fotos com marca d'água excessiva
- Repetição do mesmo ângulo/imóvel

## 🔄 Como Funciona o Carrossel

O sistema automaticamente:

1. **Busca** todas as imagens na pasta `portfolio/`
2. **Filtra** apenas arquivos `.jpg`, `.jpeg`, `.png`, `.webp`
3. **Ordena** alfabeticamente
4. **Rotaciona** automaticamente a cada 5 segundos
5. **Fallback**: Se não encontrar imagens, usa fotos do Unsplash

## 🎨 Personalização Adicional

### Alterar Tempo de Rotação

No arquivo `ModernAuthScreen.tsx`, linha ~67:

```typescript
const interval = setInterval(() => {
    setCurrentImageIndex(prev => (prev + 1) % portfolioImages.length);
}, 5000); // ← Altere aqui (5000 = 5 segundos)
```

### Alterar Texto do Carrossel

No arquivo `ModernAuthScreen.tsx`, linhas ~304-310:

```typescript
<h2 className="text-4xl xl:text-5xl font-bold text-white mb-4">
    Fotografia profissional<br />para imóveis de luxo
</h2>
<p className="text-xl text-white/90 mb-6">
    Transforme seus imóveis em obras de arte visuais
</p>
```

### Adicionar Mais Social Proof

No arquivo `ModernAuthScreen.tsx`, linhas ~213-227, você pode adicionar mais métricas.

## 🚀 Otimização de Performance

### Comprimir Imagens

Use ferramentas online para comprimir:
- [TinyPNG](https://tinypng.com/) - Para PNG
- [Squoosh](https://squoosh.app/) - Para JPG/WebP
- [ImageOptim](https://imageoptim.com/) - App para Mac

### Converter para WebP

WebP oferece 30% menos tamanho com mesma qualidade:

```bash
# Instalar cwebp
brew install webp  # Mac
apt install webp   # Linux

# Converter imagens
cwebp -q 85 input.jpg -o output.webp
```

## ✅ Checklist de Configuração

- [ ] Criar bucket `public-assets` no Supabase
- [ ] Configurar como público
- [ ] Adicionar políticas de acesso (RLS)
- [ ] Criar pasta `logo/`
- [ ] Upload da logo (sheep_house_logo.png)
- [ ] Criar pasta `portfolio/`
- [ ] Upload de pelo menos 4-6 fotos de imóveis
- [ ] Testar a página de login
- [ ] Verificar se o carrossel está funcionando
- [ ] Verificar se a logo aparece

## 🐛 Troubleshooting

### Imagens não aparecem

1. Verificar se o bucket é **público**
2. Verificar se as políticas de RLS estão corretas
3. Abrir o console do navegador e verificar erros
4. Verificar URLs no Network tab

### Carrossel não rotaciona

- Verifique se há mais de 1 imagem na pasta `portfolio/`
- Verificar console do navegador para erros JavaScript

### Logo não aparece

- Verificar se o arquivo está em `public-assets/logo/sheep_house_logo.png`
- Verificar se o nome está exatamente correto (case-sensitive)

## 📞 Suporte

Se tiver dúvidas, consulte:
- [Documentação Supabase Storage](https://supabase.com/docs/guides/storage)
- Console do navegador (F12 > Console)
