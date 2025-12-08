-- ==============================================================================
-- SHEEP HOUSE CRM - INTELLIGENT AUTOMATION SETUP
-- ==============================================================================

-- 1. ENUMS & TYPES
-- Padronização dos status e tipos para garantir consistência nos dados.

do $$ begin
    create type public.crm_lifecycle_stage as enum (
      'Lead',           -- Cadastrou, nunca comprou
      'Onboarding',     -- Fez a 1ª compra (fase de teste)
      'Active',         -- Compra recorrente (Cliente ideal)
      'AtRisk',         -- Diminuiu frequência ou sumiu (Risco de Churn)
      'Churned',        -- Parou de comprar (Perdido)
      'Recovery',       -- Estava em risco/churn e voltou a comprar
      'Discarded'       -- Inativo/Não Perturbe/Faliu (Não conta nas métricas)
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.crm_alert_type as enum (
      'GHOST_ACTIVATION', -- Cliente cadastrado sem compras (Lead Frio)
      'CHURN_RISK',       -- Cliente sumido há muito tempo
      'UPSELL_OPPORTUNITY', -- Cliente fiel com ticket baixo ou mix pobre
      'LOW_PENETRATION',  -- Imobiliária com muitos corretores mas poucos ativos
      'BIRTHDAY'          -- Aniversário de parceria ou do cliente
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.crm_activity_type as enum (
      'WHATSAPP',
      'CALL',
      'EMAIL',
      'MEETING',
      'NOTE'
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.crm_activity_result as enum (
      'SUCCESS',          -- Venda feita / Reagendado
      'SNOOZE',           -- "Me liga mês que vem"
      'NO_ANSWER',        -- Não atendeu
      'LOST',             -- "Estou com concorrente" / "Não tenho demanda"
      'DO_NOT_DISTURB'    -- Pediu para sair da lista
    );
exception
    when duplicate_object then null;
end $$;

-- 2. TABELAS ESTRUTURAIS

-- Tabela de Redes (Ex: Remax, Netimóveis, etc)
create table if not exists public.networks (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  color text default '#6366f1', -- Cor para gráficos
  created_at timestamp with time zone default now()
);

-- Tabela Principal de Métricas (O Cérebro)
create table if not exists public.client_crm_metrics (
  client_id uuid primary key references public.clients(id) on delete cascade,
  
  -- Segmentação
  lifecycle_stage public.crm_lifecycle_stage default 'Lead',
  
  -- Métricas de Tempo
  signup_date date,
  first_booking_date date,
  last_booking_date date,
  days_since_last_booking integer default 0,
  
  -- Métricas Financeiras
  total_bookings_count integer default 0,
  total_spent numeric(10,2) default 0,
  avg_ticket numeric(10,2) default 0,
  
  -- Métricas de Penetração (Para Imobiliárias)
  total_brokers_count integer default 0,
  active_brokers_count integer default 0, -- Corretores com pelo menos 1 pedido
  penetration_rate numeric(5,2) default 0, -- %
  
  -- Saúde
  health_score integer default 100, -- 0 a 100
  
  updated_at timestamp with time zone default now()
);

-- Tabela de Atividades (O Histórico Real)
create table if not exists public.crm_activities (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  performed_by uuid, -- ID do usuário (Admin) que fez a ação
  
  type public.crm_activity_type not null,
  result public.crm_activity_result,
  
  notes text,
  
  created_at timestamp with time zone default now()
);

-- Tabela de Alertas (O Painel de Oportunidades)
create table if not exists public.crm_alerts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  
  type public.crm_alert_type not null,
  priority text check (priority in ('HIGH', 'MEDIUM', 'LOW')) default 'MEDIUM',
  
  status text check (status in ('PENDING', 'ACTIONED', 'DISMISSED')) default 'PENDING',
  
  snooze_until date, -- Se estiver preenchido, o alerta fica oculto até essa data
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. RLS (SEGURANÇA)
alter table public.networks enable row level security;
alter table public.client_crm_metrics enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_alerts enable row level security;

-- Políticas permissivas para desenvolvimento
drop policy if exists "Enable all access" on public.networks;
create policy "Enable all access" on public.networks for all using (true) with check (true);

drop policy if exists "Enable all access" on public.client_crm_metrics;
create policy "Enable all access" on public.client_crm_metrics for all using (true) with check (true);

drop policy if exists "Enable all access" on public.crm_activities;
create policy "Enable all access" on public.crm_activities for all using (true) with check (true);

drop policy if exists "Enable all access" on public.crm_alerts;
create policy "Enable all access" on public.crm_alerts for all using (true) with check (true);


-- 4. AUTOMAÇÃO (FUNCTIONS & TRIGGERS)

-- Função A: Calcular Métricas do Cliente
create or replace function public.recalculate_crm_metrics()
returns trigger as $$
declare
  v_client_id uuid;
  v_total_spent numeric;
  v_total_count int;
  v_last_date date;
  v_first_date date;
  v_days_since int;
  v_stage public.crm_lifecycle_stage;
  v_health int;
begin
  -- Determinar Client ID dependendo da tabela de origem
  if TG_TABLE_NAME = 'bookings' then
    v_client_id := NEW.client_id;
  elsif TG_TABLE_NAME = 'brokers' then
    v_client_id := NEW.client_id;
  else
    return NEW;
  end if;

  -- Se não tiver client_id, ignora
  if v_client_id is null then return NEW; end if;

  -- 1. Calcular Totais Financeiros e Datas
  select 
    coalesce(sum(total_price), 0),
    count(*),
    max(date),
    min(date)
  into 
    v_total_spent,
    v_total_count,
    v_last_date,
    v_first_date
  from public.bookings 
  where client_id = v_client_id and status not in ('Cancelado', 'Rascunho');

  -- 2. Calcular Dias sem Comprar
  if v_last_date is not null then
    v_days_since := (current_date - v_last_date);
  else
    v_days_since := null;
  end if;

  -- 3. Definir Lifecycle Stage e Health Score
  if v_total_count = 0 then
    v_stage := 'Lead';
    v_health := 50; -- Neutro
  elsif v_total_count = 1 and v_days_since < 30 then
    v_stage := 'Onboarding';
    v_health := 80;
  elsif v_days_since <= 30 then
    v_stage := 'Active';
    v_health := 100;
  elsif v_days_since <= 60 then
    v_stage := 'AtRisk';
    v_health := 50;
  else
    v_stage := 'Churned';
    v_health := 10;
  end if;

  -- 4. Upsert na tabela de métricas
  insert into public.client_crm_metrics (
    client_id, 
    lifecycle_stage, 
    last_booking_date, 
    first_booking_date,
    days_since_last_booking,
    total_bookings_count,
    total_spent,
    avg_ticket,
    health_score,
    updated_at
  )
  values (
    v_client_id,
    v_stage,
    v_last_date,
    v_first_date,
    v_days_since,
    v_total_count,
    v_total_spent,
    case when v_total_count > 0 then v_total_spent / v_total_count else 0 end,
    v_health,
    now()
  )
  on conflict (client_id) do update set
    lifecycle_stage = EXCLUDED.lifecycle_stage,
    last_booking_date = EXCLUDED.last_booking_date,
    days_since_last_booking = EXCLUDED.days_since_last_booking,
    total_bookings_count = EXCLUDED.total_bookings_count,
    total_spent = EXCLUDED.total_spent,
    avg_ticket = EXCLUDED.avg_ticket,
    health_score = EXCLUDED.health_score,
    updated_at = now();

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger para Bookings
drop trigger if exists on_booking_change_crm on public.bookings;
create trigger on_booking_change_crm
after insert or update on public.bookings
for each row execute procedure public.recalculate_crm_metrics();


-- Função B: Gerador de Alertas Inteligente
create or replace function public.generate_crm_alerts()
returns trigger as $$
declare
  v_has_recent_activity boolean;
  v_has_pending_alert boolean;
begin
  -- Regra 1: Risco de Churn (AtRisk ou Churned)
  if NEW.lifecycle_stage in ('AtRisk', 'Churned') then
    
    -- Verifica se já existe alerta pendente desse tipo
    select exists(select 1 from public.crm_alerts where client_id = NEW.client_id and type = 'CHURN_RISK' and status = 'PENDING')
    into v_has_pending_alert;

    -- Verifica se houve atividade recente (Cool-down de 30 dias)
    select exists(
      select 1 from public.crm_activities 
      where client_id = NEW.client_id 
      and created_at > (now() - interval '30 days')
    ) into v_has_recent_activity;

    -- Se NÃO tem alerta pendente E NÃO tem atividade recente -> GERA ALERTA
    if not v_has_pending_alert and not v_has_recent_activity then
      insert into public.crm_alerts (client_id, type, priority, status)
      values (NEW.client_id, 'CHURN_RISK', 'HIGH', 'PENDING');
    end if;
  end if;

  -- Regra 3: Limpeza Automática
  -- Se o cliente voltou a ser Active ou Onboarding, remove alertas de Risco pendentes
  if NEW.lifecycle_stage in ('Active', 'Onboarding') then
    update public.crm_alerts 
    set status = 'DISMISSED', updated_at = now()
    where client_id = NEW.client_id 
    and type = 'CHURN_RISK' 
    and status = 'PENDING';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger nas Métricas
drop trigger if exists on_metrics_change_alerts on public.client_crm_metrics;
create trigger on_metrics_change_alerts
after insert or update on public.client_crm_metrics
for each row execute procedure public.generate_crm_alerts();


-- ==============================================================================
-- 5. CARGA INICIAL (BACKFILL) - RODE ISTO PARA POPULAR O CRM COM DADOS ANTIGOS
-- ==============================================================================

insert into public.client_crm_metrics (
    client_id, 
    lifecycle_stage, 
    last_booking_date, 
    first_booking_date, 
    days_since_last_booking, 
    total_bookings_count, 
    total_spent, 
    avg_ticket, 
    health_score, 
    updated_at
)
select 
    c.id,
    case 
        when count(b.id) = 0 then 'Lead'::public.crm_lifecycle_stage
        when (current_date - max(b.date)) <= 30 then 'Active'::public.crm_lifecycle_stage
        when (current_date - max(b.date)) <= 60 then 'AtRisk'::public.crm_lifecycle_stage
        else 'Churned'::public.crm_lifecycle_stage
    end,
    max(b.date),
    min(b.date),
    (current_date - max(b.date)),
    count(b.id),
    coalesce(sum(b.total_price), 0),
    case when count(b.id) > 0 then coalesce(sum(b.total_price), 0) / count(b.id) else 0 end,
    case 
        when count(b.id) = 0 then 50
        when (current_date - max(b.date)) <= 30 then 100
        when (current_date - max(b.date)) <= 60 then 50
        else 10
    end,
    now()
from public.clients c
left join public.bookings b on b.client_id = c.id and b.status not in ('Cancelado', 'Rascunho')
group by c.id
on conflict (client_id) do update set
    lifecycle_stage = EXCLUDED.lifecycle_stage,
    last_booking_date = EXCLUDED.last_booking_date,
    days_since_last_booking = EXCLUDED.days_since_last_booking,
    total_bookings_count = EXCLUDED.total_bookings_count,
    total_spent = EXCLUDED.total_spent,
    avg_ticket = EXCLUDED.avg_ticket,
    health_score = EXCLUDED.health_score,
    updated_at = now();

