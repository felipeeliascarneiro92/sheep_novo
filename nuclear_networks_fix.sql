-- NUCLEAR OPTION: Re-create Networks Table with Minimal Constraints and Permissive RLS
-- This script deletes the networks table and recreates it.
-- ONLY RUN THIS IF YOU ARE SURE YOU CAN LOSE EXISTING NETWORKS DATA (looks like you have none anyway since create fails).

-- 1. Drop existing tables (cleanup)
DROP TABLE IF EXISTS network_prices CASCADE;
DROP TABLE IF EXISTS networks CASCADE;

-- 2. Create 'networks' table
CREATE TABLE networks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create 'network_prices' table
CREATE TABLE network_prices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE NOT NULL,
    service_id TEXT NOT NULL, -- Keep as TEXT to avoid FK issues with services if not uuid
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(network_id, service_id)
);

-- 4. Enable RLS
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_prices ENABLE ROW LEVEL SECURITY;

-- 5. Create PERMISSIVE Policies (Allow ALL for now to unblock)
-- These allow any authenticated user to read/write.
-- Refine later once it works.

CREATE POLICY "Allow All Networks" ON networks
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow All Prices" ON network_prices
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Ensure clients table has the column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'network_id') THEN 
        ALTER TABLE clients ADD COLUMN network_id UUID REFERENCES networks(id) ON DELETE SET NULL; 
    END IF; 
END $$;
