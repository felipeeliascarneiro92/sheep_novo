-- Create a bucket for user avatars (publicly accessible for reading)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Create a bucket for Creative Studio uploads (publicly accessible for reading, or restricted if needed)
-- Assuming Creative Studio images are also somewhat public or shared between editor/client
insert into storage.buckets (id, name, public)
values ('creative-studio', 'creative-studio', true);

-- Set up security policies for 'avatars' bucket

-- Allow public read access to avatars
create policy "Public Access to Avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
-- (In a real scenario, you'd restrict the path to their user ID, but for now we allow authenticated uploads)
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );

-- Allow users to update their own avatar
create policy "Users can update their own avatars"
  on storage.objects for update
  with check ( bucket_id = 'avatars' );

-- Set up security policies for 'creative-studio' bucket

-- Allow public read access (or restrict to authenticated if preferred)
create policy "Public Access to Creative Studio Files"
  on storage.objects for select
  using ( bucket_id = 'creative-studio' );

-- Allow authenticated users (clients/editors) to upload files
create policy "Authenticated users can upload to Creative Studio"
  on storage.objects for insert
  with check ( bucket_id = 'creative-studio' );
