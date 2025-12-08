-- Fix ID column types to support legacy IDs (e.g. "2")
-- These columns might be UUIDs, but we need them to be TEXT to support migrated data.

-- Photographers table
ALTER TABLE public.photographers ALTER COLUMN id TYPE text;

-- Time Offs table
ALTER TABLE public.time_offs ALTER COLUMN photographer_id TYPE text;

-- Bookings table
ALTER TABLE public.bookings ALTER COLUMN photographer_id TYPE text;
