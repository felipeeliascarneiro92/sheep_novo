-- Fix Networks Schema & RLS

-- 1. Ensure Tables Exist
CREATE TABLE IF NOT EXISTS networks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS network_prices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE NOT NULL,
    service_id TEXT REFERENCES services(id) ON DELETE CASCADE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(network_id, service_id)
);

-- 2. Ensure clients has network_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'network_id') THEN 
        ALTER TABLE clients ADD COLUMN network_id UUID REFERENCES networks(id) ON DELETE SET NULL; 
    END IF; 
END $$;

-- 3. Enable RLS
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_prices ENABLE ROW LEVEL SECURITY;

-- 4. Clean up Policies (Remove ALL potential old versions)
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."networks";
DROP POLICY IF EXISTS "Enable insert for admins only" ON "public"."networks";
DROP POLICY IF EXISTS "Enable update for admins only" ON "public"."networks";
DROP POLICY IF EXISTS "Enable delete for admins only" ON "public"."networks";
DROP POLICY IF EXISTS "Permitir leitura de redes para todos autenticados" ON "public"."networks";
DROP POLICY IF EXISTS "Permitir gestão de redes para autenticados" ON "public"."networks";

DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable insert for admins only" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable update for admins only" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable delete for admins only" ON "public"."network_prices";
DROP POLICY IF EXISTS "Permitir leitura de preços de rede para todos autenticados" ON "public"."network_prices";
DROP POLICY IF EXISTS "Permitir gestão de preços para autenticados" ON "public"."network_prices";

-- 5. Re-Apply Correct Policies

-- READ for all authenticated permissions
CREATE POLICY "Enable read access for all users" ON "public"."networks" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."network_prices" FOR SELECT TO authenticated USING (true);

-- WRITE for Admins (using admins table check)
CREATE POLICY "Enable insert for admins only" ON "public"."networks" FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid()));
CREATE POLICY "Enable update for admins only" ON "public"."networks" FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid()));
CREATE POLICY "Enable delete for admins only" ON "public"."networks" FOR DELETE TO authenticated USING (auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid()));

CREATE POLICY "Enable insert for admins only" ON "public"."network_prices" FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid()));
CREATE POLICY "Enable update for admins only" ON "public"."network_prices" FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid()));
CREATE POLICY "Enable delete for admins only" ON "public"."network_prices" FOR DELETE TO authenticated USING (auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid()));

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_clients_network_id ON clients(network_id);
