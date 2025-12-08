-- Add asaas_payment_id to transactions table for idempotency
alter table public.transactions 
add column if not exists asaas_payment_id text;

-- Create an index for faster lookups
create index if not exists idx_transactions_asaas_payment_id on public.transactions(asaas_payment_id);
