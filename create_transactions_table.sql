-- Tabela de Transações (Transactions)
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id),
  date timestamp with time zone default now(),
  description text,
  type text check (type in ('Credit', 'Debit')),
  amount numeric(10,2) not null,
  created_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table public.transactions enable row level security;

-- Política de acesso (aberta para desenvolvimento)
drop policy if exists "Enable all access for all users" on public.transactions;
create policy "Enable all access for all users" on public.transactions for all using (true) with check (true);
