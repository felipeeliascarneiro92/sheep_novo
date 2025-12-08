-- Add notification fields to clients table

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS whatsapp_notification1 TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_notification2 TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"whatsapp": true, "email": true, "promotions": false}'::jsonb;

-- Comment on columns for clarity
COMMENT ON COLUMN clients.whatsapp_notification1 IS 'Secondary WhatsApp number for notifications';
COMMENT ON COLUMN clients.whatsapp_notification2 IS 'Tertiary WhatsApp number for notifications';
COMMENT ON COLUMN clients.notification_preferences IS 'JSON object storing notification preferences (whatsapp, email, promotions)';
