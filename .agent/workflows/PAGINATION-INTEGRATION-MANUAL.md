# 🛠️ MANUAL COMPLETO - INTEGRAÇÃO DA PAGINAÇÃO

**IMPORTANTE:** Siga este guia passo a passo para integrar a paginação sem erros.

---

## 📋 PARTE 1: ManageClients.tsx

### Passo 1: Adicionar Import (Linha ~9)

**LOCALIZAR:**
```typescript
import { useClients, useClient, useInvalidateClients } from '../hooks/useQueries';
```

**SUBSTITUIR POR:**
```typescript
import { useClients, useClient, useInvalidateClients, useClientsPaginated } from '../hooks/useQueries';
import Pagination from './Pagination';
```

### Passo 2: Modificar Hook de Dados (Linha ~943)

**LOCALIZAR:**
```typescript
const ManageClients: React.FC = () => {
    // ✅ OTIMIZAÇÃO: Usar hook com cache ao invés de useEffect manual
    const { data: allClients = [], isLoading, refetch } = useClients();
    const invalidateClients = useInvalidateClients();
```

**SUBSTITUIR POR:**
```typescript
const ManageClients: React.FC = () => {
    // ✅ OTIMIZAÇÃO: Paginação + Cache
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;
    
    const { data: paginatedData, isLoading, isFetching, refetch } = useClientsPaginated(currentPage, PAGE_SIZE);
    const allClients = paginatedData?.data || [];
    const totalCount = paginatedData?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    
    const invalidateClients = useInvalidateClients();
```

### Passo 3: Adicionar Componente Pagination (Linha ~1109, ANTES do fechamento da div principal)

**LOCALIZAR (aproximadamente linha 1109):**
```typescript
                    )) : (<div className="text-center py-10 text-slate-500 dark:text-slate-400"><p>Nenhum cliente encontrado.</p></div>)}
                </div>
            </div>
```

**INSERIR APÓS (antes do </div> final):**
```typescript
                    )) : (<div className="text-center py-10 text-slate-500 dark:text-slate-400"><p>Nenhum cliente encontrado.</p></div>)}
                </div>
                
                {/* Paginação */}
                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={PAGE_SIZE}
                        onPageChange={setCurrentPage}
                        isLoading={isFetching}
                    />
                )}
            </div>
```

---

## 📋 PARTE 2: ManagePhotographers.tsx

### Passo 1: Adicionar Import (Linha ~12)

**LOCALIZAR:**
```typescript
import { usePhotographers, useInvalidatePhotographers } from '../hooks/useQueries';
```

**SUBSTITUIR POR:**
```typescript
import { usePhotographers, useInvalidatePhotographers, usePhotographersPaginated } from '../hooks/useQueries';
import Pagination from './Pagination';
```

### Passo 2: Modificar Hook de Dados (procure por "const ManagePhotographers")

**LOCALIZAR:**
```typescript
const ManagePhotographers: React.FC = () => {
    // ✅ OTIMIZAÇÃO: Usar hook com cache
    const { data: allPhotographers = [], isLoading, refetch } = usePhotographers();
    const invalidatePhotographers = useInvalidatePhotographers();
```

**SUBSTITUIR POR:**
```typescript
const ManagePhotographers: React.FC = () => {
    // ✅ OTIMIZAÇÃO: Paginação + Cache
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;
    
    const { data: paginatedData, isLoading, isFetching, refetch } = usePhotographersPaginated(currentPage, PAGE_SIZE);
    const allPhotographers = paginatedData?.data || [];
    const totalCount = paginatedData?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    
    const invalidatePhotographers = useInvalidatePhotographers();
```

### Passo 3: Adicionar Componente Pagination

Procure pelo final da listagem de fotógrafos (similar ao ManageClients) e adicione:

```typescript
                {/* Paginação */}
                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={PAGE_SIZE}
                        onPageChange={setCurrentPage}
                        isLoading={isFetching}
                    />
                )}
```

---

## ✅ CHECKLIST FINAL

Após fazer as modificações:

- [ ] ManageClients.tsx tem `useClientsPaginated` import
- [ ] ManageClients.tsx tem `Pagination` import
- [ ] ManageClients.tsx usa `currentPage` state
- [ ] ManageClients.tsx renderiza `<Pagination />` component
- [ ] ManagePhotographers.tsx tem `usePhotographersPaginated` import
- [ ] ManagePhotographers.tsx tem `Pagination` import  
- [ ] ManagePhotographers.tsx usa `currentPage` state
- [ ] ManagePhotographers.tsx renderiza `<Pagination />` component
- [ ] `npm run dev` roda sem erros
- [ ] TypeScript não mostra erros

---

## 🧪 TESTE

1. Abra `http://localhost:5173`
2. Vá para "Gerenciar Clientes"
3. Deve ver:
   - Lista com no máximo 50 clientes
   - Controles de paginação no rodapé
   - "Mostrando 1 a 50 de X resultados"
4. Clique em "Próximo" → deve funcionar
5. Dados devem vir do cache ao voltar

---

## ❌ SE DER ERRO

Se houver erro de TypeScript ou sintaxe:

```bash
# Reverter mudanças
git checkout -- components/ManageClients.tsx
git checkout -- components/ManagePhotographers.tsx

# Tentar novamente com mais cuidado
```

---

**DICA:** Faça um componente por vez. Teste ManageClients primeiro, depois ManagePhotographers.

**BOA SORTE! 🚀**
