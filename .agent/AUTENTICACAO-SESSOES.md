# 🔐 AUTENTICAÇÃO E SESSÕES - COMO FUNCIONA

## ⏱️ **TEMPO DE SESSÃO ATUAL:**

### **Supabase Auth (Padrão):**
- ✅ **Sessão:** 7 dias (604.800 segundos)
- ✅ **Refresh Token:** Sem expiração (até logout manual)
- ✅ **Auto-refresh:** A cada hora

---

## 🔄 **COMO FUNCIONA:**

### **1. Login Bem-Sucedido:**
```
1. Cliente faz login
2. Supabase Auth cria sessão
3. Token salvo no localStorage
4. Sessão válida por 7 dias
```

### **2. Durante os 7 Dias:**
```
- ✅ Usuário abre o app → Login automático
- ✅ Fecha navegador → Continua logado
- ✅ Reinicia PC → Continua logado
- ✅ Token atualiza automaticamente a cada hora
```

### **3. Após 7 Dias SEM USAR:**
```
- ❌ Sessão expira
- 🔐 Pede login novamente
```

---

## 💾 **STORAGE ATUAL:**

### **localStorage (Usado Agora):**
```javascript
localStorage.setItem('sheep_user', JSON.stringify(user));
```

**Características:**
- ✅ Persiste entre sessões
- ✅ Não expira (até limpar cache)
- ✅ Sobrevive a reinicialização
- ❌ Mesmo se fechar navegador

---

## 🎯 **OPÇÕES DE SESSÃO:**

### **OPÇÃO 1: Atual (7 dias automático)** ✅
```
Comportamento:
- Login 1x → Fica logado por 7 dias
- Não precisa re-logar
- Ideal para uso diário
```

### **OPÇÃO 2: "Lembrar-me" (checkbox)**
```
☑️ Marcado: Sessão 30 dias
☐ Desmarcado: Sessão até fechar navegador
```

### **OPÇÃO 3: Sessão curta (1 hora)**
```
Para alta segurança:
- Expira em 1 hora
- Pede login frequente
```

---

## 📋 **IMPLEMENTAÇÃO "LEMBRAR-ME":**

### **Com checkbox:**
```typescript
const [rememberMe, setRememberMe] = useState(true);

// No login:
if (rememberMe) {
    localStorage.setItem('sheep_user', JSON.stringify(user));
} else {
    sessionStorage.setItem('sheep_user', JSON.stringify(user));
}
```

**Diferença:**
- `localStorage`: Persiste mesmo fechando navegador
- `sessionStorage`: Expira ao fechar aba/navegador

---

## 🔒 **SEGURANÇA:**

### **Proteções Atuais:**
- ✅ Tokens JWT assinados (Supabase)
- ✅ HTTPS obrigatório
- ✅ Refresh automático
- ✅ Hash de senhas (bcrypt)

### **Melhorias Possíveis:**
- 🔐 Logout automático por inatividade (30 min sem ação)
- 🔐 Detectar múltiplos dispositivos
- 🔐 2FA (autenticação de 2 fatores)

---

## 🎛️ **CONFIGURAÇÕES DISPONÍVEIS:**

### **No Supabase Dashboard:**
```
https://app.supabase.com/project/ptwpsuvkrcbkfkutddnq/settings/auth
```

**Pode ajustar:**
- JWT Expiry: 3600s (1h), 604800s (7d), etc
- Refresh Token Lifetime: Unlimited ou custom
- Enable Email Confirmations
- Password Requirements

---

## 💡 **RECOMENDAÇÃO PARA SEU CASO:**

### **Usuários Padrão (Clientes/Corretores):**
```
✅ Sessão: 7 dias
✅ Checkbox "Lembrar-me": Sim
✅ Auto-refresh: Ativado
```

**Por quê?**
- Conveniência (não fica pedindo login)
- Uso frequente durante semana
- Ainda expira se ficar inativo

### **Admin/Fotógrafos:**
```
☑️ Opcional: Sessão mais curta (1 dia)
☑️ Logout automático após 30 min inativo
```

**Por quê?**
- Dados sensíveis
- Controle de acesso
- Auditoria

---

## 🧪 **TESTAR EXPIRAÇÃO:**

### **Forçar logout após tempo:**
```typescript
// Em AuthContext.tsx
useEffect(() => {
    const checkExpiry = setInterval(() => {
        const savedTime = localStorage.getItem('sheep_login_time');
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
        
        if (savedTime && (now - parseInt(savedTime)) > maxAge) {
            logout();
        }
    }, 60000); // Verifica a cada minuto
    
    return () => clearInterval(checkExpiry);
}, []);
```

---

## 📊 **RESUMO:**

| Configuração | Atual | Com "Lembrar-me" |
|--------------|-------|-------------------|
| **Sessão padrão** | 7 dias | 30 dias (marcado) |
| **Fecha navegador** | Logado | Desloga (desmarcado) |
| **Refresh automático** | ✅ Sim | ✅ Sim |
| **localStorage** | ✅ Sim | Condicional |
| **Conveniência** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Segurança** | ⭐⭐⭐ | ⭐⭐⭐ |

---

## ✅ **QUER IMPLEMENTAR?**

Posso adicionar:
1. ✅ Checkbox "Lembrar-me" na tela de login
2. ✅ Opção de sessão (30 dias vs até fechar)
3. ✅ Logout automático por inatividade
4. ✅ Mensagem "Sua sessão expira em X dias"

**Você quer qual? Ou deixa do jeito que está (7 dias automático)?** 🚀
