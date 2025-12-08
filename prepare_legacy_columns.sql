-- Add legacy_id to photographers if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photographers' AND column_name = 'legacy_id') THEN
        ALTER TABLE photographers ADD COLUMN legacy_id INTEGER;
        CREATE INDEX idx_photographers_legacy_id ON photographers(legacy_id);
    END IF;
END $$;

-- Add legacy_id and legacy_group_id to clients if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'legacy_id') THEN
        ALTER TABLE clients ADD COLUMN legacy_id INTEGER;
        CREATE INDEX idx_clients_legacy_id ON clients(legacy_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'legacy_group_id') THEN
        ALTER TABLE clients ADD COLUMN legacy_group_id INTEGER;
        CREATE INDEX idx_clients_legacy_group_id ON clients(legacy_group_id);
    END IF;
END $$;

-- Ensure bookings has legacy_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'legacy_id') THEN
        ALTER TABLE bookings ADD COLUMN legacy_id INTEGER;
        CREATE INDEX idx_bookings_legacy_id ON bookings(legacy_id);
    END IF;
END $$;
