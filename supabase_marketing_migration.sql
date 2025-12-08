-- Create marketing_posts table
CREATE TABLE IF NOT EXISTS marketing_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "imageUrl" TEXT,
  type TEXT NOT NULL CHECK (type IN ('promotion', 'news', 'tip', 'upsell')),
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "actionLink" TEXT,
  "actionText" TEXT
);

-- Enable Row Level Security
ALTER TABLE marketing_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active posts
CREATE POLICY "Everyone can view active marketing posts" 
ON marketing_posts FOR SELECT 
USING ("isActive" = true);

-- Policy: Admins can view all posts (including inactive)
-- Note: You might need to adjust this based on your auth setup. 
-- For now, allowing authenticated users to view all might be simpler if you don't have strict role checks in RLS yet,
-- or strictly check for admin role if you have that setup.
CREATE POLICY "Admins can view all marketing posts" 
ON marketing_posts FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Only Admins can insert/update/delete
-- Assuming you have a way to check for admin role, e.g., via a profile table or metadata.
-- For simplicity in this snippet, we'll allow authenticated users to edit (assuming only admins/editors have access to the dashboard page).
-- Ideally: USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))
CREATE POLICY "Admins can insert marketing posts" 
ON marketing_posts FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admins can update marketing posts" 
ON marketing_posts FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Admins can delete marketing posts" 
ON marketing_posts FOR DELETE 
TO authenticated 
USING (true);
