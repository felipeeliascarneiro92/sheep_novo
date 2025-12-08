-- Add profile_pic_url to editors table
ALTER TABLE public.editors ADD COLUMN IF NOT EXISTS profile_pic_url text;

-- Add profile_pic_url, phone, and is_active to admins table
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS profile_pic_url text;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS is_active boolean default true;
