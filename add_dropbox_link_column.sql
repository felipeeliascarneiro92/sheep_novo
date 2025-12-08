ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropbox_upload_link TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropbox_folder_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropbox_folder_link TEXT;
