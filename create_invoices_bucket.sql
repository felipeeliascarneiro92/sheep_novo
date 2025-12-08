-- Create a bucket for invoices (private, accessible by authenticated users)
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false);

-- Set up security policies for 'invoices' bucket

-- Allow authenticated users to upload their own invoices
create policy "Authenticated users can upload invoices"
  on storage.objects for insert
  with check ( bucket_id = 'invoices' and auth.role() = 'authenticated' );

-- Allow users to read their own invoices (and admins to read all)
-- For simplicity in this context, we allow authenticated users to read (or we can restrict by folder path if needed)
create policy "Authenticated users can read invoices"
  on storage.objects for select
  using ( bucket_id = 'invoices' and auth.role() = 'authenticated' );
