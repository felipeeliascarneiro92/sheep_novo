-- Drop foreign key constraints first
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_photographer_id_fkey;
ALTER TABLE public.time_offs DROP CONSTRAINT IF EXISTS time_offs_photographer_id_fkey;

-- Change ID columns to TEXT
ALTER TABLE public.photographers ALTER COLUMN id TYPE text;
ALTER TABLE public.bookings ALTER COLUMN photographer_id TYPE text;
ALTER TABLE public.time_offs ALTER COLUMN photographer_id TYPE text;

-- Re-add foreign key constraints
ALTER TABLE public.bookings ADD CONSTRAINT bookings_photographer_id_fkey FOREIGN KEY (photographer_id) REFERENCES public.photographers(id);
ALTER TABLE public.time_offs ADD CONSTRAINT time_offs_photographer_id_fkey FOREIGN KEY (photographer_id) REFERENCES public.photographers(id);
