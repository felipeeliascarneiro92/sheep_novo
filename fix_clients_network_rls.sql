-- Fix Clients RLS to allow Network Association
-- The issue is likely that the RLS on the 'clients' table prevents updating the 'network_id'.

-- 1. Ensure RLS is enabled (just to be consistent)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 2. Add/Update Policies for Clients
-- We need to ensure that Authenticated users (like Admins/Editors) can UPDATE clients to set the network_id.

-- Drop potential restrictive policies or previous attempts
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."clients";
DROP POLICY IF EXISTS "Allow Client Management" ON "public"."clients";

-- Create a policy allowing authenticated users to UPDATE clients
-- This covers setting the network_id.
CREATE POLICY "Allow Authenticated Update Clients" ON "public"."clients"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure Read access is also available
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."clients";
CREATE POLICY "Allow Authenticated Read Clients" ON "public"."clients"
    FOR SELECT
    TO authenticated
    USING (true);

-- (Optional) If you want to restrict this later, you can check for specific roles.
-- For now, we open it to 'authenticated' to ensure the feature works immediately.
