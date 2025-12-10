-- Helper function to check admin status securely
-- Uses SECURITY DEFINER to bypass RLS on the admins table itself
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

-- --- NETWORKS TABLE ---

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for admins only" ON "public"."networks";
DROP POLICY IF EXISTS "Enable update for admins only" ON "public"."networks";
DROP POLICY IF EXISTS "Enable delete for admins only" ON "public"."networks";

-- Re-create policies using the helper function
CREATE POLICY "Enable insert for admins only" ON "public"."networks" FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Enable update for admins only" ON "public"."networks" FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Enable delete for admins only" ON "public"."networks" FOR DELETE TO authenticated USING (is_admin());


-- --- NETWORK PRICES TABLE ---

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for admins only" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable update for admins only" ON "public"."network_prices";
DROP POLICY IF EXISTS "Enable delete for admins only" ON "public"."network_prices";

-- Re-create policies using the helper function
CREATE POLICY "Enable insert for admins only" ON "public"."network_prices" FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Enable update for admins only" ON "public"."network_prices" FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Enable delete for admins only" ON "public"."network_prices" FOR DELETE TO authenticated USING (is_admin());
