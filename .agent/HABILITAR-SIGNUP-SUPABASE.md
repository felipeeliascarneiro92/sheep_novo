# 🔴 URGENTE: Habilitar Signup no Supabase

## ❌ Erro Atual:
```
Signups not allowed for this instance
```

O cadastro público está **DESABILITADO** no Supabase!

---

## ✅ SOLUÇÃO (2 minutos):

### **Habilitar Sign Ups no Supabase**

#### Passo 1: Abrir Supabase Dashboard
```
https://app.supabase.com/project/ptwpsuvkrcbkfkutddnq/auth/providers
```

#### Passo 2: Configurar Email Provider
1. No menu lateral: **Authentication** → **Providers**
2. Clique em **Email**
3. Procure por:
   - **"Enable sign ups"** 
   - OU **"Allow new sign ups"**
   - OU **"Disable sign ups"** (se estiver marcado, DESMARCAR)

4. **MARQUE/HABILITE** a opção de permitir cadastros ✅

5. **Salve** (botão "Save" no final da página)

---

## 📸 Screenshot de Onde Configurar:

**Caminho no Supabase:**
```
Dashboard
  └─ Authentication
       └─ Providers
            └─ Email
                 ├─ [✅] Enable sign ups  ← MARCAR/HABILITAR
                 └─ [ ] Enable email confirmations  ← Já desabilitou antes
```

---

## 🔧 O que também foi corrigido:

### ✅ Autocomplete do Google Maps
- Agora só inicializa quando chegar no Passo 2
- **NÃO vai mais dar erro "Input ref não encontrado"**

---

## 🧪 TESTE DEPOIS DE HABILITAR:

1. **Recarregue a página** (F5)
2. **Vá para Cadastro**
3. **Passo 1:** Preencha dados
4. **Clique "Continuar"**

### **Passo 2 - Endereço:**

**No Console deve aparecer:**
```
🚀 Step 2 montado, inicializando autocomplete...
🗺️ Iniciando Google Maps Autocomplete...
✅ Google Maps disponível
📚 Importando Places library...
✅ Places library importada
🎯 Criando Autocomplete instance...
✅ Autocomplete configurado com sucesso!
```

**No campo de endereço:**
- Digite: `Rua XV de Novembro, Curitiba`
- **DEVEM APARECER SUGESTÕES** do Google
- Selecione uma
- **Campos preenchem automaticamente**

### **Clique "Finalizar Cadastro":**

**No Console:**
```
🔐 Criando usuário no Supabase Auth...
✅ Usuário criado no Auth: [ID]
💾 Criando registro na tabela clients...
✅ Cliente criado com sucesso!
🔓 Fazendo login automático...
```

**Resultado:**
- ✅ Cadastro funciona
- ✅ Login automático
- ✅ Entra no dashboard
- ✅ **SEM ERROS!**

---

## 📋 Checklist Final:

- [ ] Abrir Supabase Dashboard
- [ ] Ir em Authentication → Providers → Email
- [ ] **HABILITAR** "Enable sign ups" ✅
- [ ] **DESABILITAR** "Enable email confirmations" (já fez antes)
- [ ] Salvar
- [ ] Recarregar página de cadastro
- [ ] Testar Passo 1
- [ ] Testar Passo 2 (autocomplete)
- [ ] Finalizar cadastro
- [ ] ✅ TUDO DEVE FUNCIONAR!

---

## ⚠️ IMPORTANTE:

Após habilitar:
- ✅ Qualquer pessoa pode se cadastrar
- ✅ Emails não são verificados (confirmação desabilitada)
- ✅ Login funciona imediatamente
- ⚠️ Para produção, você pode querer:
  - Configurar SMTP para enviar emails
  - Habilitar confirmação de email
  - Adicionar captcha
  - Limitar rate de cadastros

**Mas para desenvolvimento, está OK assim!**

---

## 🎯 RESUMO:

1. **AGORA:** Habilitar "Enable sign ups" no Supabase
2. **TESTAR:** Cadastro completo
3. **RESULTADO:** Tudo deve funcionar! 🚀

**Configure agora e teste!** 🔥
