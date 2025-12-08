-- Auto-generate legacy_id for new bookings
-- This mimics the old system's ID generation to facilitate folder organization

-- 1. Create a sequence
-- We verify if it exists first
CREATE SEQUENCE IF NOT EXISTS bookings_legacy_id_seq START WITH 50000;

-- Ensure it starts at 50000 even if it already existed (resetting it)
ALTER SEQUENCE bookings_legacy_id_seq RESTART WITH 50000;

-- OPTIONAL: If you want to sync the sequence with existing max legacy_id:
-- SELECT setval('bookings_legacy_id_seq', (SELECT MAX(legacy_id::int) FROM bookings WHERE legacy_id ~ '^[0-9]+$') + 1);
-- (We comment this out to avoid errors if legacy_id contains non-numeric text, but you can run it manually if needed)

-- 2. Create a function to assign legacy_id
CREATE OR REPLACE FUNCTION set_legacy_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign if legacy_id is null
  IF NEW.legacy_id IS NULL THEN
    NEW.legacy_id := nextval('bookings_legacy_id_seq')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger
DROP TRIGGER IF EXISTS trigger_set_legacy_id ON bookings;

CREATE TRIGGER trigger_set_legacy_id
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_legacy_id_on_insert();
