-- Add history column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;
