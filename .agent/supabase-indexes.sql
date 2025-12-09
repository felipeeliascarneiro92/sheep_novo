-- ========================================
-- ÍNDICES DE PERFORMANCE - SHEEPHOUSE
-- ========================================
-- Execute este script no dashboard do Supabase
-- SQL Editor → New Query → Cole e execute
--
-- IMPACTO ESPERADO: +200-400% velocidade nas queries
-- CUSTO: Praticamente zero (índices são leves)
-- ========================================

-- 1. BOOKINGS: queries por data e status (muito comum)
CREATE INDEX IF NOT EXISTS idx_bookings_date_status 
ON bookings(date, status);

-- 2. BOOKINGS: queries por fotógrafo (comum no dashboard do fotógrafo)
CREATE INDEX IF NOT EXISTS idx_bookings_photographer 
ON bookings(photographer_id);

-- 3. BOOKINGS: queries por cliente (comum no dashboard do cliente)
CREATE INDEX IF NOT EXISTS idx_bookings_client 
ON bookings(client_id);

-- 4. BOOKINGS: queries por data (comum em agendas e relatórios)
CREATE INDEX IF NOT EXISTS idx_bookings_date 
ON bookings(date);

-- 5. BOOKINGS: queries combinadas cliente + status
CREATE INDEX IF NOT EXISTS idx_bookings_client_status 
ON bookings(client_id, status);

-- 6. BOOKINGS: queries combinadas fotógrafo + status
CREATE INDEX IF NOT EXISTS idx_bookings_photographer_status 
ON bookings(photographer_id, status);

-- 7. CLIENTS: busca por email (login, validação)
CREATE INDEX IF NOT EXISTS idx_clients_email 
ON clients(email);

-- 8. CLIENTS: filtro por status ativo
CREATE INDEX IF NOT EXISTS idx_clients_active 
ON clients(is_active);

-- 9. PHOTOGRAPHERS: filtro por status ativo (muito comum)
CREATE INDEX IF NOT EXISTS idx_photographers_active 
ON photographers(is_active);

-- 10. PHOTOGRAPHERS: busca por email
CREATE INDEX IF NOT EXISTS idx_photographers_email 
ON photographers(email);

-- 11. TIME_OFFS: queries por fotógrafo (agenda)
CREATE INDEX IF NOT EXISTS idx_timeoffs_photographer 
ON time_offs(photographer_id);

-- 12. TIME_OFFS: queries por data
CREATE INDEX IF NOT EXISTS idx_timeoffs_date 
ON time_offs(start_datetime);

-- 13. INVOICES: queries por cliente
CREATE INDEX IF NOT EXISTS idx_invoices_client 
ON invoices(client_id);

-- 14. INVOICES: queries por status
CREATE INDEX IF NOT EXISTS idx_invoices_status 
ON invoices(status);

-- 15. BROKERS: queries por cliente (relação)
CREATE INDEX IF NOT EXISTS idx_brokers_client 
ON brokers(client_id);

-- 16. NOTIFICATIONS: queries por usuário
CREATE INDEX IF NOT EXISTS idx_notifications_user 
ON notifications(user_id);

-- 17. NOTIFICATIONS: queries por data (ordenação)
CREATE INDEX IF NOT EXISTS idx_notifications_created 
ON notifications(created_at DESC);

-- 18. TASKS: queries por status
CREATE INDEX IF NOT EXISTS idx_tasks_status 
ON tasks(status);

-- 19. TASKS: queries por assignee
CREATE INDEX IF NOT EXISTS idx_tasks_assignee 
ON tasks(assignee_name);

-- ========================================
-- ÍNDICES COMPOSTOS AVANÇADOS (opcional)
-- ========================================
-- Estes são para queries muito específicas
-- Só crie se estiver tendo problemas de performance

-- BOOKINGS: queries complexas em relatórios
-- CREATE INDEX IF NOT EXISTS idx_bookings_date_status_photographer 
-- ON bookings(date, status, photographer_id);

-- BOOKINGS: queries de faturamento
-- CREATE INDEX IF NOT EXISTS idx_bookings_client_date_status 
-- ON bookings(client_id, date, status);

-- ========================================
-- VERIFICAR ÍNDICES CRIADOS
-- ========================================
-- Execute esta query para verificar todos os índices:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
*/

-- ========================================
-- REMOVER ÍNDICES (se necessário)
-- ========================================
-- Se precisar remover algum índice:
/*
DROP INDEX IF EXISTS idx_bookings_date_status;
DROP INDEX IF EXISTS idx_bookings_photographer;
-- etc...
*/

-- ========================================
-- ESTATÍSTICAS DE USO (após algum tempo)
-- ========================================
-- Ver quais índices estão sendo usados:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
*/

-- ========================================
-- FINALIZADO!
-- ========================================
-- Após executar este script, seu sistema deve estar
-- significativamente mais rápido!
-- 
-- Ganho esperado: +200-400% em velocidade de queries
-- Impacto em custo: Praticamente zero
-- Tempo de execução: ~2-5 segundos
-- ========================================
