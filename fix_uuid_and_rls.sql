-- Fix UUID and Permissions Error
-- O erro 400 provavelmente ocorre porque a função uuid_generate_v4() não existe ou ocorre um erro de recursão.
-- Vamos corrigir usando gen_random_uuid() (nativo do Postgres moderno) e garantindo as permissões.

-- 1. Habilitar extensão UUID (caso ainda queira usar v4, mas vamos mudar para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Corrigir definição da tabela 'networks' para usar gen_random_uuid()
ALTER TABLE networks ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Corrigir definição da tabela 'network_prices' para usar gen_random_uuid()
ALTER TABLE network_prices ALTER COLUMN id SET DEFAULT gen_random_uuid();


-- 4. Recriar função de verificação de admin (Garantia extra)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admins 
    WHERE id = auth.uid()
  );
END;
$$;


-- 5. REAPLICAR POLÍTICAS (Limpando tudo antes para certeza absoluta)

-- NETWORKS
DROP POLICY IF EXISTS "Enable insert for admins only" ON "public"."networks";
DROP POLICY IF EXISTS "Enable update for admins only" ON "public"."networks";
DROP POLICY IF EXISTS "Enable delete for admins only" ON "public"."networks";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."networks";

-- Create READ policy
CREATE POLICY "Enable read access for all users" ON "public"."networks" FOR SELECT TO authenticated USING (true);

-- Create WRITE policies using secure function
CREATE POLICY "Enable insert for admins only" ON "public"."networks" FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Enable update for admins only" ON "public"."networks" FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Enable delete for admins only" ON "public"."networks" FOR DELETE TO authenticated USING (is_admin());


-- NETWORK PRICES
DROP POLICY IF EXISTS "Enable insert for admins only" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable update for admins only" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable delete for admins only" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."network_prices";

-- Create READ policy
CREATE POLICY "Enable read access for all users" ON "public"."network_prices" FOR SELECT TO authenticated USING (true);

-- Create WRITE policies using secure function
CREATE POLICY "Enable insert for admins only" ON "public"."network_prices" FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Enable update for admins only" ON "public"."network_prices" FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Enable delete for admins only" ON "public"."network_prices" FOR DELETE TO authenticated USING (is_admin());
