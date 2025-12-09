# 📧 Configurar Brevo (Sendinblue) para Emails

## 🎯 Por que Brevo?

- ✅ **300 emails/dia GRÁTIS** (muito melhor que Supabase)
- ✅ Interface moderna e fácil
- ✅ Templates de email prontos
- ✅ Estatísticas detalhadas
- ✅ API poderosa
- ✅ Suporte em português

---

## 📋 PASSO A PASSO COMPLETO:

### **PARTE 1: Criar Conta no Brevo**

#### 1. Acessar Brevo
```
https://www.brevo.com/pt/
```

#### 2. Criar Conta Grátis
- Clique em **"Inscreva-se gratuitamente"**
- Preencha:
  - Nome
  - Email
  - Senha
- Confirme email (verifique caixa de entrada)

#### 3. Completar Cadastro
- Nome da empresa: **SheepHouse**
- Tipo: **Outro** ou **Serviços**
- Número de funcionários: **1-10**
- Clique **"Continuar"**

---

### **PARTE 2: Obter Credenciais SMTP**

#### 1. Acessar Configurações SMTP
```
Dashboard → Configurações (engrenagem) → SMTP & API
```

Ou direto:
```
https://app.brevo.com/settings/keys/smtp
```

#### 2. Copiar Credenciais
Você verá algo assim:

```
┌────────────────────────────────────────┐
│ SMTP Server                            │
│ smtp-relay.brevo.com                   │
│                                        │
│ Port                                   │
│ 587 (TLS)                              │
│                                        │
│ Login                                  │
│ seu@email.com                          │
│                                        │
│ SMTP Key                               │
│ xkeysib-xxxxx (clique para revelar)   │
└────────────────────────────────────────┘
```

**IMPORTANTE:** Anote essas informações!

---

### **PARTE 3: Configurar no Supabase**

#### 1. Abrir Configurações do Supabase
```
https://app.supabase.com/project/ptwpsuvkrcbkfkutddnq/settings/auth
```

#### 2. Ir em SMTP Settings
- Vá até a seção **"SMTP Settings"**
- Clique em **"Enable Custom SMTP"** ✅

#### 3. Preencher Dados do Brevo

```
┌─────────────────────────────────────────────┐
│ SMTP Settings                               │
├─────────────────────────────────────────────┤
│ Enable Custom SMTP: ✅                      │
│                                             │
│ Host:                                       │
│ smtp-relay.brevo.com                        │
│                                             │
│ Port Number:                                │
│ 587                                         │
│                                             │
│ Sender email:                               │
│ noreply@sheephouse.com.br                   │
│ (ou seu email do Brevo)                     │
│                                             │
│ Sender name:                                │
│ SheepHouse                                  │
│                                             │
│ Username:                                   │
│ seu@email.com                               │
│ (o email da sua conta Brevo)                │
│                                             │
│ Password:                                   │
│ xkeysib-xxxxx                               │
│ (a SMTP Key que você copiou)                │
└─────────────────────────────────────────────┘
```

#### 4. Salvar
- Clique em **"Save"** no final da página
- Aguarde confirmação ✅

---

### **PARTE 4: Testar**

#### 1. Teste de Recuperação de Senha

**No seu app:**
1. Vá para **"Esqueci minha senha"**
2. Digite seu email
3. Clique **"Enviar"**

**Console deve mostrar:**
```
🔑 Solicitando recuperação de senha para: seu@email.com
✅ Email de recuperação enviado com sucesso!
```

**Você deve receber o email em segundos!** ⚡

#### 2. Verificar no Brevo

**Ver email enviado:**
```
Dashboard → Estatísticas → Transacionais
```

Você verá:
- ✅ Email enviado
- ✅ Email entregue
- ✅ Email aberto (quando você abrir)
- ✅ Link clicado (quando clicar)

---

## 🎨 **BÔNUS: Customizar Templates de Email**

O Brevo permite criar templates lindos! Vou te mostrar depois se quiser.

---

## 📊 **LIMITES DO PLANO GRÁTIS:**

```
✅ 300 emails/dia
✅ Emails ilimitados de contatos
✅ Templates profissionais
✅ Estatísticas detalhadas
✅ API completa
```

**Para SheepHouse, isso é mais que suficiente!**

---

## 🔧 **CONFIGURAÇÃO COMPLETA (RESUMO):**

### **No Brevo:**
```
1. Criar conta: https://www.brevo.com/pt/
2. Verificar email
3. Pegar credenciais SMTP: Dashboard → SMTP & API
```

### **No Supabase:**
```
1. Settings → Auth → SMTP Settings
2. Enable Custom SMTP ✅
3. Preencher:
   - Host: smtp-relay.brevo.com
   - Port: 587
   - Username: [seu email Brevo]
   - Password: [SMTP Key do Brevo]
   - Sender email: noreply@sheephouse.com.br
   - Sender name: SheepHouse
4. Save ✅
```

---

## ⚠️ **IMPORTANTE:**

### **Email do Remetente:**

**Opção 1: Usar o email da conta**
```
Sender email: seu@email.com
```
✅ Funciona imediatamente

**Opção 2: Usar domínio próprio (Requer verificação)**
```
Sender email: noreply@sheephouse.com.br
```
⚠️ Precisa verificar domínio no Brevo primeiro

**Recomendação inicial:** Use o email da sua conta

---

## 🎯 **PRÓXIMOS PASSOS APÓS CONFIGURAR:**

1. ✅ Testar recuperação de senha
2. ✅ Testar cadastro (se ativar email confirmation)
3. 🎨 Customizar templates (opcional)
4. 📊 Ver estatísticas no Brevo

---

## 📧 **VERIFICAR DOMÍNIO (OPCIONAL - AVANÇADO):**

Se quiser usar `noreply@sheephouse.com.br`:

### No Brevo:
```
1. Dashboard → Senders & IP
2. Add Domain
3. Digite: sheephouse.com.br
4. Copiar registros DNS (SPF, DKIM)
```

### No seu provedor de domínio:
```
1. Adicionar registros DNS fornecidos pelo Brevo
2. Aguardar verificação (até 48h)
```

**Mas para começar, use seu email mesmo!**

---

## 🆘 **TROUBLESHOOTING:**

### **Erro ao enviar:**
```
1. Verifique Username e Password no Supabase
2. Confirme que Port é 587
3. Veja logs no Brevo (Dashboard → Logs)
```

### **Email não chega:**
```
1. Verifique spam/lixeira
2. Confirme email no Brevo: Dashboard → Estatísticas
3. Veja se sender email está verificado
```

---

## ✅ **CHECKLIST:**

- [ ] Criar conta no Brevo
- [ ] Verificar email da conta
- [ ] Pegar credenciais SMTP (Dashboard → SMTP & API)
- [ ] Configurar no Supabase (Settings → Auth → SMTP)
- [ ] Salvar configurações
- [ ] Testar "Esqueci minha senha"
- [ ] Verificar email recebido
- [ ] Ver estatísticas no Brevo

---

## 🎉 **RESULTADO FINAL:**

Depois de configurar:
- ✅ Emails de recuperação funcionam
- ✅ Emails chegam em segundos
- ✅ Estatísticas detalhadas
- ✅ 300 emails/dia grátis
- ✅ Interface linda do Brevo

---

**Vamos configurar agora? Te guio passo a passo!** 🚀

**Já tem conta no Brevo ou precisa criar?**
