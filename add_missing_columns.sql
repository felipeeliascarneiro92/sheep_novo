-- Add columns to photographers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photographers' AND column_name = 'cpf') THEN
        ALTER TABLE photographers ADD COLUMN cpf TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photographers' AND column_name = 'address') THEN
        ALTER TABLE photographers ADD COLUMN address TEXT;
    END IF;
END $$;

-- Add columns to clients (if missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'address') THEN
        ALTER TABLE clients ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'cpf') THEN
        ALTER TABLE clients ADD COLUMN cpf TEXT;
    END IF;
    -- Check for email and phone in clients too, usually they exist but good to be sure
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'email') THEN
        ALTER TABLE clients ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'phone') THEN
        ALTER TABLE clients ADD COLUMN phone TEXT;
    END IF;
END $$;
