-- Secure RLS Policies for Chat System
-- This file should be executed AFTER chat_setup.sql and chat_media_setup.sql

-- 1. Disable the loose policies created in chat_setup.sql (if they exist)
DROP POLICY IF EXISTS "Enable read access for all users" ON conversations;
DROP POLICY IF EXISTS "Enable insert access for all users" ON conversations;
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert access for all users" ON messages;
DROP POLICY IF EXISTS "Enable update access for all users" ON messages;

-- 2. Enable RLS (just in case)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. Conversations Policies

-- SELECT: Users can see conversations if they are the client, photographer, or an admin
-- using ::text casts to allow comparison regardless of column type (UUID vs Text)
CREATE POLICY "View Conversations" ON conversations
FOR SELECT
USING (
  exists (
    select 1 from bookings b
    where b.id::text = conversations.booking_id::text
    and (
      b.client_id::text = auth.uid()::text
      or b.photographer_id::text = auth.uid()::text
    )
  )
  OR
  exists (
    select 1 from admins a
    where a.id::text = auth.uid()::text
  )
);

-- INSERT: System helps create them, usually triggers or services. 
-- Assuming the service needs to create it, authenticated users can create IF they are part of the booking.
CREATE POLICY "Create Conversations" ON conversations
FOR INSERT
WITH CHECK (
  exists (
    select 1 from bookings b
    where b.id::text = booking_id::text
    and (
      b.client_id::text = auth.uid()::text
      or b.photographer_id::text = auth.uid()::text
    )
  )
  OR
  exists (
    select 1 from admins a
    where a.id::text = auth.uid()::text
  )
);

-- 4. Messages Policies

-- SELECT: Users can see messages if they have access to the conversation
CREATE POLICY "View Messages" ON messages
FOR SELECT
USING (
  exists (
    select 1 from conversations c
    join bookings b on b.id::text = c.booking_id::text
    where c.id = messages.conversation_id
    and (
      b.client_id::text = auth.uid()::text
      or b.photographer_id::text = auth.uid()::text
      or exists (select 1 from admins a where a.id::text = auth.uid()::text)
    )
  )
);

-- INSERT: Users can send messages to conversations they have access to
CREATE POLICY "Send Messages" ON messages
FOR INSERT
WITH CHECK (
  exists (
    select 1 from conversations c
    join bookings b on b.id::text = c.booking_id::text
    where c.id = conversation_id
    and (
      b.client_id::text = auth.uid()::text
      or b.photographer_id::text = auth.uid()::text
      or exists (select 1 from admins a where a.id::text = auth.uid()::text)
    )
  )
);

-- UPDATE: Users can update their own messages (e.g. mark as read? No, mark as read is an update)
CREATE POLICY "Update Messages (Mark as Read)" ON messages
FOR UPDATE
USING (
    -- Can update if I am a participant (simplified)
    exists (
    select 1 from conversations c
    join bookings b on b.id::text = c.booking_id::text
    where c.id = messages.conversation_id
    and (
      b.client_id::text = auth.uid()::text
      or b.photographer_id::text = auth.uid()::text
      or exists (select 1 from admins a where a.id::text = auth.uid()::text)
    )
  )
);
