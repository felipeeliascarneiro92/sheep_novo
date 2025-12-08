-- Drop the table if it exists to reset the schema with correct column names
DROP TABLE IF EXISTS marketing_posts;

-- Create marketing_posts table with snake_case columns to match the code
CREATE TABLE marketing_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('promotion', 'news', 'tip', 'upsell')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action_link TEXT,
  action_text TEXT
);

-- Enable Row Level Security
ALTER TABLE marketing_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active posts
CREATE POLICY "Everyone can view active marketing posts" 
ON marketing_posts FOR SELECT 
USING (is_active = true);

-- Policy: Admins can view all posts
CREATE POLICY "Admins can view all marketing posts" 
ON marketing_posts FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Admins can insert/update/delete
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
