
alter table public.clients add column if not exists legacy_id text;
alter table public.clients add column if not exists legacy_group_id text;
alter table public.photographers add column if not exists legacy_id text;
alter table public.brokers add column if not exists legacy_id text;
alter table public.admins add column if not exists legacy_id text;
