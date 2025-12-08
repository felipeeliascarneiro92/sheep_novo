-- Adiciona colunas faltantes na tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS profile_pic_url text,
ADD COLUMN IF NOT EXISTS history jsonb default '[]'::jsonb;

-- Garante que a coluna history seja iniciada como array vazio se for nula
UPDATE public.clients SET history = '[]'::jsonb WHERE history IS NULL;
