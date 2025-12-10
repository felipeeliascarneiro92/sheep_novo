
-- 1. Tabela de Redes (Networks)
CREATE TABLE IF NOT EXISTS networks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Preços por Rede (Network Prices)
-- Conecta uma rede a um serviço com um preço específico
CREATE TABLE IF NOT EXISTS network_prices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE NOT NULL,
    service_id TEXT REFERENCES services(id) ON DELETE CASCADE NOT NULL, -- Alterado para TEXT para compatibilidade
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(network_id, service_id) -- Garante que só existe um preço por serviço dentro de uma rede
);

-- 3. Adicionar coluna network_id na tabela clients
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'network_id') THEN 
        ALTER TABLE clients ADD COLUMN network_id UUID REFERENCES networks(id) ON DELETE SET NULL; 
    END IF; 
END $$;

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_prices ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Segurança (Policies)
-- Permitir leitura para todos os usuários autenticados (necessário para calcular preços no booking)
CREATE POLICY "Permitir leitura de redes para todos autenticados" 
ON networks FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir leitura de preços de rede para todos autenticados" 
ON network_prices FOR SELECT 
TO authenticated 
USING (true);

-- Permitir modificações apenas para Admins (simplificado para authenticated por enquanto para facilitar dev, idealmente restringir mais)
CREATE POLICY "Permitir gestão de redes para autenticados" 
ON networks FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Permitir gestão de preços para autenticados" 
ON network_prices FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_clients_network_id ON clients(network_id);
CREATE INDEX IF NOT EXISTS idx_network_prices_network_id ON network_prices(network_id);
CREATE INDEX IF NOT EXISTS idx_network_prices_service_id ON network_prices(service_id);
