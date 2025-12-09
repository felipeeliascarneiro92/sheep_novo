# 🎯 FASE 2: OTIMIZAÇÃO SQL - PLANO DE EXECUÇÃO

**Data:** 2025-12-08 21:47  
**Objetivo:** Otimizar queries SQL para máxima performance

---

## 📊 ANÁLISE INICIAL

### Problemas Identificados:

**47+ ocorrências de `select('*')` encontradas!**

Arquivos mais problemáticos:
1. `photographerService.ts` - 13 ocorrências
2. `financeService.ts` - 11 ocorrências  
3. `scheduleService.ts` - 6 ocorrências
4. `clientService.ts` - 7 ocorrências
5. Outros - 10+ ocorrências

---

## 🎯 ESTRATÉGIA DE OTIMIZAÇÃO

### Prioridade 1: Queries Mais Usadas (Alto Impacto)
- [ ] `getPhotographers()` - Usado em 5+ componentes
- [ ] `getClients()` - Usado em 4+ componentes
- [ ] `getAllBookings()` - Usado em 3+ componentes
- [ ] `getServices()` - Usado em múltiplos componentes

### Prioridade 2: N+1 Queries (Problema Crítico)
- [ ] `getPhotographers()` → depois busca bookings separadamente
- [ ] Loops que fazem queries individuais
- [ ] Componentes que buscam relações manualmente

### Prioridade 3: Índices Recomendados
- [ ] `bookings(photographer_id, date)`
- [ ] `bookings(client_id, status)`
- [ ] `bookings(date, status)`
- [ ] `clients(email)` - já existe?
- [ ] `photographers(is_active)`

---

## 📋 CAMPOS NECESSÁRIOS POR TABELA

### Photographers:
```sql
id, name, email, phone, base_lat, base_lng, 
radius_km, is_active, services, availability
-- Remover: created_at, updated_at se não usado na UI
-- bookings: buscar com join quando necessário
```

### Clients:
```sql
id, name, email, phone, cnpj, payment_type, 
payment_method, balance, is_active, custom_prices
-- Remover: campos raramente usados
```

### Bookings:
```sql
id, date, start_time, end_time, status, 
client_id, photographer_id, total_price, 
service_ids, address, lat, lng
-- Adicionar client_name, photographer_name se possível
```

### Services:
```sql
id, name, price, duration_minutes, category, 
status, is_visible_to_client
```

---

## 🔧 EXEMPLOS DE OTIMIZAÇÃO

### ANTES (Ruim ❌):
```typescript
const { data: photographers } = await supabase
  .from('photographers')
  .select('*'); // Busca TUDO

const { data: bookings } = await supabase
  .from('bookings')
  .select('*'); // N+1 query!

photographers.map(p => ({
  ...p,
  bookings: bookings.filter(b => b.photographer_id === p.id)
}));
```

### DEPOIS (Bom ✅):
```typescript
const { data: photographers } = await supabase
  .from('photographers')
  .select(`
    id, name, email, phone, 
    base_lat, base_lng, radius_km, 
    is_active, services, availability,
    bookings(
      id, date, start_time, status, 
      total_price, client_name
    )
  `);
// Busca tudo em 1 query com JOIN!
```

---

## 📊 GANHOS ESPERADOS

### Redução de Dados Transferidos:
```
ANTES: ~500KB por query (todos os campos)
DEPOIS: ~150KB por query (campos específicos)
ECONOMIA: 70% de banda!
```

### Redução de Queries N+1:
```
ANTES: 1 query principal + N queries para relações
DEPOIS: 1 query com JOIN
ECONOMIA: (N) queries!
```

### Performance Supabase:
```
ANTES: Queries lentas sem índices
DEPOIS: Queries rápidas com índices
MELHORIA: 3-5x mais rápido
```

---

## 🚀 PLANO DE AÇÃO

### Fase 2.1: Otimizar Queries Principais (30min)
1. photographerService.ts → getPhotographers
2. clientService.ts → getClients  
3. bookingService.ts → getAllBookings
4. resourceService.ts → getServices

### Fase 2.2: Implementar Joins (20min)
1. Photographers com bookings
2. Bookings com client info
3. Eliminar N+1 queries

### Fase 2.3: Índices no Supabase (10min)
1. Criar script SQL
2. Documentar índices recomendados
3. Instruções para aplicar

---

## ✅ CHECKLIST DE EXECUÇÃO

- [ ] Analisar campos realmente usados
- [ ] Criar versões otimizadas das queries
- [ ] Substituir select('*') por campos específicos
- [ ] Implementar joins onde necessário
- [ ] Testar que tudo ainda funciona
- [ ] Criar script de índices
- [ ] Documentar mudanças
- [ ] Medir ganhos

---

## 📏 MÉTRICAS DE SUCESSO

- **Redução de banda:** -60-80%
- **Redução de queries:** -40-60% (eliminando N+1)
- **Performance:** +200-400% mais rápido
- **Custos:** -50-70% no Supabase

---

**EM DESENVOLVIMENTO...**  
Próximo arquivo: `photographerService.ts`
