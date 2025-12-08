ALTER TABLE invoices ADD COLUMN IF NOT EXISTS asaas_invoice_url text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS asaas_bank_slip_url text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE;
