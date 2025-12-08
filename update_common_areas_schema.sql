-- Add media_link and notes to common_areas table
ALTER TABLE public.common_areas ADD COLUMN IF NOT EXISTS media_link text;
ALTER TABLE public.common_areas ADD COLUMN IF NOT EXISTS notes text;
