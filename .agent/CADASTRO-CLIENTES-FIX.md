# ✅ Correções Aplicadas - Cadastro de Clientes

## 🔧 Problema: Invalid login credentials

### ❌ Causa:
O sistema criava o cliente na tabela `clients` mas **NÃO criava no Supabase Auth**. Quando tentava fazer login, as credenciais não existiam.

### ✅ Solução Aplicada:
Modificado `RegisterPage.tsx` para:
1. **Criar usuário no Supabase Auth PRIMEIRO** (`supabase.auth.signUp`)
2. **Usar o ID do Auth** para criar o registro na tabela `clients`
3. **Login automático** funciona porque usuário já está no Auth

---

## 📋 Status Atual

### ✅ Corrigido:
- [x] Erro de coluna 'password' não encontrada
- [x] Integração Asaas desabilitada temporariamente
- [x] Fluxo de autenticação corrigido (Auth → Clients)

### ⚠️ Ainda Precisa Configurar:
- [ ] **Google Maps API Key** - Para autocomplete de endereço

---

## 🗺️ Google Maps - Como Configurar

O código do autocomplete **JÁ ESTÁ PRONTO**, mas precisa da API Key.

### Passo a Passo:

#### 1. Obter API Key
```
1. Acesse: https://console.cloud.google.com/
2. Crie/selecione um projeto
3. Menu > "APIs & Services" > "Library"
4. Ative estas APIs:
   - Places API
   - Maps JavaScript API
5. Menu > "APIs & Services" > "Credentials"
6. Clique "Create Credentials" > "API key"
7. Copie a chave gerada
```

#### 2. Adicionar no Projeto

Crie/edite arquivo `.env` na **raiz do projeto**:

```env
# Supabase (já deve ter)
VITE_SUPABASE_URL=https://ptwpsuvkrcbkfkutddnq.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_atual

# Google Maps (ADICIONAR)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyA...SUA_CHAVE_AQUI
```

#### 3. Reiniciar Servidor

**IMPORTANTE:** O servidor DEVE ser reiniciado para ler o .env

```bash
# Parar (Ctrl+C no terminal onde está rodando)
# Iniciar novamente
npm run dev
```

---

## 🧪 Como Testar

### 1. Cadastro de Cliente
1. Fazer logout (se estiver logado)
2. Clicar em "Cadastre-se"
3. Preencher:
   - **Passo 1:** Nome, email, senha
   - **Passo 2:** Endereço
4. Clicar "Finalizar Cadastro"
5. **Deve:**
   - Criar usuário no Auth
   - Criar registro em clients
   - Fazer login automaticamente
   - ✅ **SEM ERROS**

### 2. Google Maps Autocomplete (após configurar API)
1. Na etapa 2 do cadastro
2. Digitar no campo "Buscar endereço (Google Maps)..."
3. **Deve aparecer sugestões**
4. Ao selecionar, **deve preencher automaticamente:**
   - Rua
   - Número
   - Bairro
   - Cidade
   - Estado
   - CEP

---

## 🎯 Checklist Final

- [x] Erro de password corrigido
- [x] Fluxo de Auth corrigido
- [x] Asaas desabilitado temporariamente
- [ ] **Você precisa:** Configurar Google Maps API Key
- [ ] **Você precisa:** Reiniciar o servidor

---

## 📌 Arquivos Modificados

1. `services/clientService.ts` - Removida senha, Asaas comentado
2. `components/RegisterPage.tsx` - Adicionado signup no Supabase Auth

---

## ❓ Perguntas Frequentes

**P: O autocomplete não funciona**
R: Você configurou a `VITE_GOOGLE_MAPS_API_KEY` no `.env` e reiniciou?

**P: Ainda dá erro no cadastro**
R: Verifique o console. Se for novo erro, me envie.

**P: Como sei se a API Key está funcionando?**
R: Ao digitar no campo de endereço, devem aparecer sugestões do Google.

---

## 🚀 Próximos Passos

1. **AGORA:** Configure Google Maps API Key
2. **Restart:** `npm run dev`
3. **Teste:** Cadastro completo
4. **Opcional:** Configurar Asaas depois (se precisar)
