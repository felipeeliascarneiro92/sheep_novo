# 🚀 Plano de Otimização - SheepHouse

## 📋 Resumo Executivo

Este plano visa **reduzir em 70-80% as requisições ao Supabase** e **melhorar em 3-5x a velocidade** de carregamento, sem quebrar a aplicação.

---

## 🎯 Fase 1: Cache Inteligente (PRIORIDADE MÁXIMA)

### 1.1 Instalar TanStack Query (React Query)
**Impacto:** ⭐⭐⭐⭐⭐  
**Risco:** 🟢 Baixíssimo  
**Tempo:** 30min  

```bash
npm install @tanstack/react-query
```

**Por quê?**
- Cache automático de dados
- Refetch inteligente
- Invalidação de cache controlada
- Reduz 60-70% das requisições

### 1.2 Configurar Query Client
Criar `contexts/QueryProvider.tsx` com cache de 5 minutos para dados estáticos.

### 1.3 Migrar Services para Hooks
Converter chamadas diretas em custom hooks com useQuery:
- `usePhotographers()` - Cache 10min
- `useClients()` - Cache 5min  
- `useBookings()` - Cache 2min
- `useServices()` - Cache 30min (raramente mudam)

---

## 🎯 Fase 2: Queries Otimizadas

### 2.1 Select Específico (não usar `select('*')`)
**Impacto:** ⭐⭐⭐⭐  
**Economia de banda:** 40-60%  

**Antes:**
```typescript
const { data } = await supabase.from('bookings').select('*');
```

**Depois:**
```typescript
const { data } = await supabase
  .from('bookings')
  .select('id, date, status, client_id, photographer_id');
```

### 2.2 Joins ao invés de múltiplas queries
**Antes** (N+1 problem):
```typescript
const bookings = await getBookings(); // 1 query
for (let b of bookings) {
  const client = await getClientById(b.client_id); // N queries
}
```

**Depois**:
```typescript
const { data } = await supabase
  .from('bookings')
  .select(`
    *,
    clients:client_id(name, email),
    photographers:photographer_id(name)
  `);
```

---

## 🎯 Fase 3: Paginação e Lazy Loading

### 3.1 Implementar Paginação em Tabelas
**Páginas afetadas:**
- `ManageClients.tsx` - Tabela de clientes
- `ManagePhotographers.tsx` - Tabela de fotógrafos  
- `AppointmentsPage.tsx` - Lista de agendamentos
- `ReportsPage.tsx` - Relatórios

**Configuração:**
- 50 itens por página
- Botões de navegação
- Indicador de página atual

### 3.2 Virtual Scrolling para Listas Grandes
Usar `react-window` para renderizar apenas itens visíveis.

---

## 🎯 Fase 4: Debouncing e Throttling

### 4.1 Debounce em Campos de Busca
**Impacto:** ⭐⭐⭐⭐  
**Economia:** 90% das requisições em buscas  

```typescript
const debouncedSearch = useMemo(
  () => debounce((term: string) => {
    // Search logic
  }, 500),
  []
);
```

### 4.2 Throttle em Scroll Events
Para widgets que atualizam ao rolar a página.

---

## 🎯 Fase 5: Otimizações React

### 5.1 Memoização
- `useMemo` para cálculos pesados
- `useCallback` para funções passadas como props
- `React.memo` para componentes que re-renderizam muito

### 5.2 Code Splitting
Lazy load de páginas:
```typescript
const ReportsPage = lazy(() => import('./components/ReportsPage'));
```

---

## 🎯 Fase 6: Índices no Banco de Dados

### 6.1 Criar Índices no Supabase
```sql
-- Otimizar queries de bookings por data
CREATE INDEX idx_bookings_date ON bookings(date);

-- Otimizar queries de bookings por status
CREATE INDEX idx_bookings_status ON bookings(status);

-- Otimizar queries de bookings por client_id
CREATE INDEX idx_bookings_client_id ON bookings(client_id);

-- Otimizar queries de bookings por photographer_id
CREATE INDEX idx_bookings_photographer_id ON bookings(photographer_id);

-- Índice composto para queries comuns
CREATE INDEX idx_bookings_date_status ON bookings(date, status);
```

---

## 📊 Ganhos Esperados

| Otimização | Redução de Requisições | Melhoria de Performance |
|------------|------------------------|-------------------------|
| React Query Cache | 60-70% | 3-4x mais rápido |
| Paginação | 80-90% | 5-10x mais rápido |
| Select Específico | 40-60% menos dados | 2x mais rápido |
| Debouncing | 90% em buscas | Instantâneo |
| Índices DB | N/A | 5-20x em queries |

**Total Estimado:** 70-85% menos requisições, 5-8x mais rápido

---

## 🚦 Ordem de Implementação Recomendada

### Semana 1 (Rápido e Seguro)
1. ✅ Instalar React Query
2. ✅ Configurar QueryClient  
3. ✅ Migrar 3-5 services principais para hooks
4. ✅ Testar em desenvolvimento

### Semana 2 (Otimizações de Query)
5. ✅ Otimizar selects (remover `*`)
6. ✅ Implementar joins
7. ✅ Adicionar índices no Supabase
8. ✅ Testar performance

### Semana 3 (UX e Polish)
9. ✅ Adicionar paginação nas tabelas principais
10. ✅ Implementar debouncing em buscas
11. ✅ Memoização estratégica
12. ✅ Testes finais

---

## ⚠️ Cuidados Importantes

1. **Sempre testar em desenvolvimento primeiro**
2. **Implementar uma otimização por vez**
3. **Fazer backup antes de mudanças grandes**
4. **Monitorar uso do Supabase após cada fase**
5. **Documentar mudanças**

---

## 🎯 Próximos Passos Imediatos

**Você quer que eu:**
1. 🟢 Comece pela Fase 1 (React Query) - RECOMENDADO
2. 🟡 Comece pela Fase 2 (Otimizar Queries)
3. 🟡 Comece pela Fase 3 (Paginação)
4. 🔵 Mostre exemplos de código específicos primeiro

**Escolha uma opção para começarmos! 🚀**
