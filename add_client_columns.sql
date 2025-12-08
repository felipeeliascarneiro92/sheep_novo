-- Add missing columns to clients table
DO $$
BEGIN
    -- trade_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'trade_name') THEN
        ALTER TABLE clients ADD COLUMN trade_name TEXT;
    END IF;

    -- person_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'person_type') THEN
        ALTER TABLE clients ADD COLUMN person_type TEXT;
    END IF;

    -- cnpj (cpf already checked)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'cnpj') THEN
        ALTER TABLE clients ADD COLUMN cnpj TEXT;
    END IF;

    -- due_day
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'due_day') THEN
        ALTER TABLE clients ADD COLUMN due_day INTEGER;
    END IF;

    -- payment_method
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'payment_method') THEN
        ALTER TABLE clients ADD COLUMN payment_method TEXT;
    END IF;

    -- asaas_customer_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'asaas_customer_id') THEN
        ALTER TABLE clients ADD COLUMN asaas_customer_id TEXT;
    END IF;
END $$;
