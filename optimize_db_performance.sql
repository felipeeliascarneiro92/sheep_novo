-- Otimização de Performance do Banco de Dados
-- Criação de índices para acelerar consultas frequentes

-- 1. Índices para a tabela de Agendamentos (Bookings)
-- Acelera busca de agendamentos por cliente (Minhas Reservas)
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);

-- Acelera ordenação por data (muito usado em listagens)
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_datesort ON bookings(date DESC, start_time DESC);

-- Acelera busca por fotógrafo
CREATE INDEX IF NOT EXISTS idx_bookings_photographer_id ON bookings(photographer_id);

-- Acelera filtros por status
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Índice composto para consultas específicas de clientes (Data + Cliente)
CREATE INDEX IF NOT EXISTS idx_bookings_client_date ON bookings(client_id, date DESC);

-- 2. Índices para a tabela de Clientes (Clients)
-- Acelera buscas por email, telefone e nome
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_network_id ON clients(network_id);

-- 3. Índices para a tabela de Serviços (Services)
-- Acelera joins com serviços
CREATE INDEX IF NOT EXISTS idx_services_id ON services(id);

-- 4. Análise de tabelas para atualizar estatísticas do planejador de consultas
ANALYZE bookings;
ANALYZE clients;
ANALYZE services;
