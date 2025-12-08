-- ==============================================================================
-- PHOTOGRAPHER FEEDBACK & PENALTY SYSTEM
-- ==============================================================================

-- 1. ENUMS
do $$ begin
    create type public.feedback_category as enum (
      'ATRASO_ENTREGA',
      'LINK_INVERTIDO',
      'ENTREGA_INCOMPLETA',
      'FALTOU_AREA_COMUM',
      'QUALIDADE',
      'RECLAMACAO_ATENDIMENTO',
      'OUTROS'
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.feedback_severity as enum (
      'INFO',
      'WARNING',
      'CRITICAL' -- Gera multa
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.transaction_type as enum (
      'DEBIT',  -- Multa / Desconto
      'CREDIT'  -- Bônus / Reembolso
    );
exception
    when duplicate_object then null;
end $$;

-- 2. TABELAS

-- Tabela de Feedbacks (Ocorrências)
create table if not exists public.photographer_feedbacks (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade,
  photographer_id text not null, -- ID do fotógrafo (string no sistema atual)
  
  category public.feedback_category not null,
  severity public.feedback_severity default 'INFO',
  
  notes text,
  
  reported_by uuid, -- ID do Admin/Editor
  created_at timestamp with time zone default now()
);

-- Tabela de Transações Financeiras do Fotógrafo (Carteira)
create table if not exists public.photographer_transactions (
  id uuid primary key default uuid_generate_v4(),
  photographer_id text not null,
  
  amount numeric(10,2) not null, -- Valor (negativo para débito, positivo para crédito)
  type public.transaction_type not null,
  
  description text,
  related_booking_id uuid references public.bookings(id) on delete set null,
  related_feedback_id uuid references public.photographer_feedbacks(id) on delete set null,
  
  created_at timestamp with time zone default now()
);

-- 3. RLS (SEGURANÇA)
alter table public.photographer_feedbacks enable row level security;
alter table public.photographer_transactions enable row level security;

-- Políticas permissivas para desenvolvimento
drop policy if exists "Enable all access" on public.photographer_feedbacks;
create policy "Enable all access" on public.photographer_feedbacks for all using (true) with check (true);

drop policy if exists "Enable all access" on public.photographer_transactions;
create policy "Enable all access" on public.photographer_transactions for all using (true) with check (true);

-- 4. NOTIFICAÇÃO (Trigger Opcional - Por enquanto faremos via código no frontend/service)
