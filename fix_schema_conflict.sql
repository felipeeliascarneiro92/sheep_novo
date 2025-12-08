-- ATENÇÃO: Este script APAGARÁ as tabelas existentes para corrigir o conflito de tipos (Text vs UUID).
-- Execute isso apenas se você puder perder os dados atuais dessas tabelas ou já tiver feito backup.

DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.brokers CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.photographers CASCADE;
DROP TABLE IF EXISTS public.common_areas CASCADE;
DROP TABLE IF EXISTS public.time_offs CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.editors CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
-- A tabela services geralmente é estática, mas se quiser resetar tudo, descomente a linha abaixo:
-- DROP TABLE IF EXISTS public.services CASCADE;

-- Agora, após rodar os comandos acima, execute o arquivo 'supabase_schema.sql' novamente.
