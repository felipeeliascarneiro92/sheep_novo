# ⚠️ ERRO DE PUSH - GITHUB SECRET SCANNING

## ❌ PROBLEMA:

O GitHub está bloqueando o push porque detectou **chaves secretas** nos commits antigos (histórico do Git).

```
error: GH013: Repository rule violations found
— Push cannot contain secrets
```

---

## ✅ SOLUÇÃO (3 OPÇÕES):

### **OPÇÃO 1: Permitir o Secret no GitHub (Mais Rápido)**

1. **Abra o link:**
   ```
   https://github.com/felipeeliascarneiro92/sheep2026/security/secret-scanning/unblock-secret/36cbUoglzVnziWdBdHNcZWZ1U?9
   ```

2. **Clique em:** "Allow this secret" ou "Permitir este secret"

3. **Rode novamente:**
   ```
   git push
   ```

4. **Deve funcionar!** ✅

---

### **OPÇÃO 2: Limpar Histórico do Git (Avançado)**

**⚠️ ATENÇÃO:** Isso reescreve o histórico!

1. **Remover arquivos do histórico:**
   ```powershell
   git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .agent/BREVO-CONFIGURAR-AGORA.md .agent/RESET-SENHA-PRONTO.md .agent/SENHA-RECUPERACAO.md" --prune-empty --tag-name-filter cat -- --all
   ```

2. **Forçar push:**
   ```powershell
   git push --force
   ```

---

### **OPÇÃO 3: Criar Novo Repositório**

Se quiser começar limpo:

1. **Criar novo repositório no GitHub**
2. **Mudar remote:**
   ```powershell
   git remote set-url origin https://github.com/felipeeliascarneiro92/NOVO-REPO.git
   ```
3. **Push:**
   ```powershell
   git push -u origin main
   ```

---

## 🎯 **RECOMENDAÇÃO:**

**Use a OPÇÃO 1** (permitir no GitHub)

É mais rápido e simples!

---

## 📋 **LIÇÃO APRENDIDA:**

**NUNCA commite chaves secretas no Git!**

- ❌ Chaves de API
- ❌ Senhas
- ❌ Tokens
- ❌ SMTP Keys

**USO CORRETO:**
- ✅ Variáveis de ambiente (`.env`)
- ✅ Configuração no painel (Supabase Dashboard)
- ✅ Secrets do GitHub (para CI/CD)

---

## 🔐 **SEGURANÇA:**

Os arquivos foram removidos nos novos commits, mas continuam no histórico antigo.

**Opções:**
1. Permitir no GitHub (rápido)
2. Limpar histórico (avançado)
3. Novo repositório (limpo)

---

**Escolha a OPÇÃO 1 e continue!** 🚀
