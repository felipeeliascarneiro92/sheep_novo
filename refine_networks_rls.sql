-- Refine RLS for Networks and Network Prices
-- Only admins should be able to modify networks and prices.
-- All authenticated users (including clients/brokers/photographers) need READ access to check prices.

-- --- NETWORKS TABLE ---

-- 1. Drop old policies (Portuguese names from previous script)
DROP POLICY IF EXISTS "Permitir leitura de redes para todos autenticados" ON "public"."networks";
DROP POLICY IF EXISTS "Permitir gestão de redes para autenticados" ON "public"."networks";
-- Drop potentially English named policies if they exist from failed runs
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."networks";
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."networks";

-- 2. Create READ policy for ALL authenticated users
CREATE POLICY "Enable read access for all users" ON "public"."networks" FOR SELECT TO authenticated USING (true);

-- 3. Create WRITE policies for ADMINS only
-- We verify admin status by checking if the user ID exists in the 'admins' table.
CREATE POLICY "Enable insert for admins only" ON "public"."networks" FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid())
);

CREATE POLICY "Enable update for admins only" ON "public"."networks" FOR UPDATE TO authenticated USING (
  auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid())
);

CREATE POLICY "Enable delete for admins only" ON "public"."networks" FOR DELETE TO authenticated USING (
  auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid())
);


-- --- NETWORK PRICES TABLE ---

-- 1. Drop old policies
DROP POLICY IF EXISTS "Permitir leitura de preços de rede para todos autenticados" ON "public"."network_prices";
DROP POLICY IF EXISTS "Permitir gestão de preços para autenticados" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."network_prices";

-- 2. Create READ policy for ALL authenticated users
CREATE POLICY "Enable read access for all users" ON "public"."network_prices" FOR SELECT TO authenticated USING (true);

-- 3. Create WRITE policies for ADMINS only
CREATE POLICY "Enable insert for admins only" ON "public"."network_prices" FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid())
);

CREATE POLICY "Enable update for admins only" ON "public"."network_prices" FOR UPDATE TO authenticated USING (
  auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid())
);

CREATE POLICY "Enable delete for admins only" ON "public"."network_prices" FOR DELETE TO authenticated USING (
  auth.uid() IN (SELECT id FROM admins WHERE id = auth.uid())
);
