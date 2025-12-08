-- Habilita a extensão para gerar UUIDs
create extension if not exists "uuid-ossp";

-- Tabela de Serviços
create table if not exists public.services (
  id text primary key, -- IDs como 'foto_profissional'
  name text not null,
  duration_minutes integer not null,
  price numeric(10,2) not null,
  category text not null,
  status text check (status in ('Ativo', 'Inativo')) default 'Ativo',
  description text,
  is_visible_to_client boolean default true
);

-- Tabela de Clientes
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  trade_name text,
  person_type text,
  is_active boolean default true,
  phone text,
  commercial_phone text,
  mobile_phone text,
  email text,
  marketing_email1 text,
  marketing_email2 text,
  cnpj text,
  state_registration text,
  due_day integer,
  payment_method text,
  payment_type text,
  network text,
  custom_prices jsonb default '{}'::jsonb,
  balance numeric(10,2) default 0,
  address jsonb, -- Armazena o objeto de endereço completo
  billing_address jsonb,
  notes text,
  referral_code text,
  referred_by uuid,
  asaas_customer_id text,
  created_at timestamp with time zone default now()
);

-- Tabela de Fotógrafos
create table if not exists public.photographers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  rg text,
  base_address text,
  base_lat double precision,
  base_lng double precision,
  radius_km integer,
  services text[], -- Array de IDs de serviços
  slot_duration_minutes integer default 60,
  availability jsonb, -- Objeto de disponibilidade
  prices jsonb default '{}'::jsonb,
  is_active boolean default true,
  profile_pic_url text,
  created_at timestamp with time zone default now()
);

-- Tabela de Agendamentos (Bookings)
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  legacy_id integer,
  client_id uuid references public.clients(id),
  photographer_id uuid references public.photographers(id),
  service_ids text[], -- Array de IDs de serviços
  date date,
  start_time text,
  end_time text,
  address text,
  lat double precision,
  lng double precision,
  status text,
  total_price numeric(10,2),
  service_price_overrides jsonb,
  rating integer,
  is_accompanied boolean default false,
  accompanying_broker_name text,
  unit_details text,
  notes text,
  internal_notes text,
  media_files text[],
  broker_id text, -- Pode ser FK se criarmos tabela de brokers
  invoice_id text,
  is_flash boolean default false,
  tip_amount numeric(10,2) default 0,
  coupon_code text,
  discount_amount numeric(10,2) default 0,
  key_state text,
  is_paid_to_photographer boolean default false,
  photographer_payout numeric(10,2) default 0,
  payout_date timestamp with time zone,
  common_area_id text,
  asaas_payment_id text,
  asaas_invoice_url text,
  asaas_pix_qr_code_url text,
  google_drive_folder_id text,
  google_drive_folder_link text,
  created_at timestamp with time zone default now()
);

-- Tabela de Corretores (Brokers)
create table if not exists public.brokers (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id),
  name text not null,
  phone text,
  email text,
  has_login boolean default true,
  is_active boolean default true,
  permissions jsonb,
  profile_pic_url text,
  created_at timestamp with time zone default now()
);

-- Habilitar Row Level Security (Opcional, mas recomendado)
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.photographers enable row level security;
alter table public.bookings enable row level security;
alter table public.brokers enable row level security;

-- Políticas de acesso básicas (Permitir tudo para anon/authenticated por enquanto para facilitar desenvolvimento)
-- Em produção, você deve restringir isso!
drop policy if exists "Enable all access for all users" on public.services;
create policy "Enable all access for all users" on public.services for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.clients;
create policy "Enable all access for all users" on public.clients for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.photographers;
create policy "Enable all access for all users" on public.photographers for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.bookings;
create policy "Enable all access for all users" on public.bookings for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.brokers;
create policy "Enable all access for all users" on public.brokers for all using (true) with check (true);

-- Tabela de Áreas Comuns
create table if not exists public.common_areas (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address jsonb,
  full_address text,
  media_link text,
  notes text,
  created_at timestamp with time zone default now()
);

-- Tabela de Folgas/Bloqueios (TimeOffs)
create table if not exists public.time_offs (
  id uuid primary key default uuid_generate_v4(),
  photographer_id uuid references public.photographers(id),
  start_datetime timestamp with time zone not null,
  end_datetime timestamp with time zone not null,
  reason text,
  type text, -- 'Bloqueio' ou 'Folga'
  created_at timestamp with time zone default now()
);

-- Tabela de Cupons
create table if not exists public.coupons (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  type text check (type in ('percentage', 'fixed')),
  value numeric(10,2) not null,
  expiration_date timestamp with time zone,
  max_uses integer,
  used_count integer default 0,
  is_active boolean default true,
  service_restriction_id text,
  used_by_client_ids text[],
  max_uses_per_client integer default 1,
  created_at timestamp with time zone default now()
);

-- Tabela de Faturas (Invoices)
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id),
  client_name text,
  month_year text,
  issue_date date,
  due_date date,
  amount numeric(10,2),
  status text,
  booking_ids text[],
  asaas_payment_id text,
  created_at timestamp with time zone default now()
);

-- Tabela de Editores
create table if not exists public.editors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  phone text,
  pix_key text,
  price_per_photo numeric(10,2) default 0,
  price_per_video numeric(10,2) default 0,
  is_active boolean default true,
  profile_pic_url text,
  created_at timestamp with time zone default now()
);

-- Tabela de Admins
create table if not exists public.admins (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  role text default 'admin',
  permissions text[],
  profile_pic_url text,
  phone text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.common_areas enable row level security;
alter table public.time_offs enable row level security;
alter table public.coupons enable row level security;
alter table public.invoices enable row level security;
alter table public.editors enable row level security;
alter table public.admins enable row level security;

drop policy if exists "Enable all access for all users" on public.common_areas;
create policy "Enable all access for all users" on public.common_areas for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.time_offs;
create policy "Enable all access for all users" on public.time_offs for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.coupons;
create policy "Enable all access for all users" on public.coupons for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.invoices;
create policy "Enable all access for all users" on public.invoices for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.editors;
create policy "Enable all access for all users" on public.editors for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.admins;
create policy "Enable all access for all users" on public.admins for all using (true) with check (true);

-- Tabela de Tarefas (Tasks)
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id),
  title text not null,
  description text,
  status text default 'Pendente',
  assignee_name text,
  payout numeric(10,2) default 0,
  due_date date,
  related_service_id text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Tabela de Comentários de Tarefas
create table if not exists public.task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references public.tasks(id) on delete cascade,
  text text not null,
  author text not null,
  created_at timestamp with time zone default now()
);

-- Tabela de Solicitações de Edição
create table if not exists public.editing_requests (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id),
  status text default 'Pendente',
  total_price numeric(10,2) default 0,
  editor_notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Tabela de Itens de Edição
create table if not exists public.editing_request_items (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references public.editing_requests(id) on delete cascade,
  original_file_name text,
  original_file_url text,
  service_ids text[],
  instructions text,
  edited_file_url text
);

-- Tabela de Logs de Auditoria
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  timestamp timestamp with time zone default now(),
  actor_id text,
  actor_name text,
  role text,
  action_type text,
  category text,
  details text,
  metadata jsonb
);

-- RLS para novas tabelas
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.editing_requests enable row level security;
alter table public.editing_request_items enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Enable all access for all users" on public.tasks;
create policy "Enable all access for all users" on public.tasks for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.task_comments;
create policy "Enable all access for all users" on public.task_comments for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.editing_requests;
create policy "Enable all access for all users" on public.editing_requests for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.editing_request_items;
create policy "Enable all access for all users" on public.editing_request_items for all using (true) with check (true);

drop policy if exists "Enable all access for all users" on public.audit_logs;
create policy "Enable all access for all users" on public.audit_logs for all using (true) with check (true);

-- Tabela de Notificações
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid, -- Pode ser null se for broadcast, ou específico para um usuário
  role text, -- 'client', 'photographer', 'admin', etc.
  title text not null,
  message text not null,
  type text check (type in ('success', 'warning', 'info', 'urgent')),
  link text,
  read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Enable all access for all users" on public.notifications;
create policy "Enable all access for all users" on public.notifications for all using (true) with check (true);

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

alter table public.transactions enable row level security;

drop policy if exists "Enable all access for all users" on public.transactions;
create policy "Enable all access for all users" on public.transactions for all using (true) with check (true);
