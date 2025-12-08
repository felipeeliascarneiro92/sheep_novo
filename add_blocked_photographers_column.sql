ALTER TABLE clients ADD COLUMN IF NOT EXISTS "blockedPhotographers" text[] DEFAULT '{}';
