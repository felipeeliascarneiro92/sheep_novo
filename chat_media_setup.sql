
-- Update messages table to support media
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text'; -- 'text', 'image', 'audio', 'file'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Create Storage Bucket for Chat
-- Note: This requires the storage extension to be enabled, which is default in Supabase.
-- We will create a bucket named 'chat-attachments'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for chat-attachments
-- Anyone logged in can upload (simplified for now)
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Anyone can view specific files if they are public
CREATE POLICY "Anyone can read chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');
