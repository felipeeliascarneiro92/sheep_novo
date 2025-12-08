alter table public.coupons add column if not exists max_uses_per_client integer default 1;
