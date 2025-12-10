-- REPAIR CLIENTS COLUMN & CONSTRAINTS
-- This script safely resets the network_id column on the clients table to ensure it matches the networks table correctly.

-- 1. Drop the column and its dependencies (if any) to clean the slate
-- Note: usage of CASCADE will drop related indexes automatically.
ALTER TABLE clients DROP COLUMN IF EXISTS network_id CASCADE;

-- 2. Add the column back with explicit UUID type
ALTER TABLE clients ADD COLUMN network_id UUID;

-- 3. Add the Foreign Key constraint
-- "ON DELETE SET NULL" ensures that if a network is deleted, the client just becomes "independent" rather than being deleted.
ALTER TABLE clients 
    ADD CONSTRAINT fk_clients_network 
    FOREIGN KEY (network_id) 
    REFERENCES networks(id) 
    ON DELETE SET NULL;

-- 4. Create an Index for performance (and to avoid full table scans that might cause timeouts/400s on large datasets)
CREATE INDEX idx_clients_network_id ON clients(network_id);

-- 5. Force RLS update permissions again (just to be absolutely safe)
-- Allow authenticated users to update any column (including network_id) on clients.
DROP POLICY IF EXISTS "Allow Authenticated Update Clients" ON clients;
CREATE POLICY "Allow Authenticated Update Clients" ON clients
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
