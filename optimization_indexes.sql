
-- ==============================================================================
-- OTIMIZAÇÃO DE PERFORMANCE - ÍNDICES
-- ==============================================================================
-- Este script cria índices nas colunas mais utilizadas para filtros e junções (JOINs).
-- Isso vai acelerar drasticamente o carregamento de listas e relatórios.

-- 1. Tabela BOOKINGS (Agendamentos) - A mais crítica
-- Acelera: "Meus Agendamentos", "Agendamentos da Imobiliária", Filtros por Data e Status
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_photographer_id ON public.bookings (photographer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_broker_id ON public.bookings (broker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings (date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_legacy_id ON public.bookings (legacy_id); -- Útil para manutenção

-- Acelera ordenação por data (muito comum)
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at);

-- 2. Tabela BROKERS (Corretores)
-- Acelera: Listagem de corretores de uma imobiliária, Login
CREATE INDEX IF NOT EXISTS idx_brokers_client_id ON public.brokers (client_id);
CREATE INDEX IF NOT EXISTS idx_brokers_email ON public.brokers (email);
CREATE INDEX IF NOT EXISTS idx_brokers_legacy_id ON public.brokers (legacy_id);

-- 3. Tabela CLIENTS (Imobiliárias)
-- Acelera: Buscas por nome e manutenção
CREATE INDEX IF NOT EXISTS idx_clients_legacy_group_id ON public.clients (legacy_group_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name);

-- 4. Tabela PHOTOGRAPHERS (Fotógrafos)
-- Acelera: Login e buscas
CREATE INDEX IF NOT EXISTS idx_photographers_email ON public.photographers (email);
CREATE INDEX IF NOT EXISTS idx_photographers_legacy_id ON public.photographers (legacy_id);

-- 5. Tabela SERVICES (Serviços)
CREATE INDEX IF NOT EXISTS idx_services_legacy_id ON public.services (legacy_id);

-- ==============================================================================
-- FIM DA OTIMIZAÇÃO
-- ==============================================================================
