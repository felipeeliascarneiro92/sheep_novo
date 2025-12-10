-- 1. Add target_clients column to networks table
ALTER TABLE networks 
ADD COLUMN IF NOT EXISTS target_clients INTEGER DEFAULT 0;

-- 2. Create a function to get network stats efficiently
CREATE OR REPLACE FUNCTION get_network_summaries()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  target_clients INTEGER,
  total_registered INTEGER,
  active_count INTEGER,
  attention_count INTEGER,
  critical_count INTEGER,
  no_booking_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH client_bookings AS (
      -- Get the latest booking for each client
      SELECT 
          c.id as client_id,
          c.network_id,
          MAX(b.created_at) as last_booking_date
      FROM clients c
      LEFT JOIN bookings b ON c.id = b.client_id
      WHERE c.network_id IS NOT NULL
      GROUP BY c.id, c.network_id
  ),
  client_status AS (
      -- Determine status for each client
      SELECT
          network_id,
          CASE 
              WHEN last_booking_date IS NULL THEN 'no_booking'
              WHEN last_booking_date > NOW() - INTERVAL '30 days' THEN 'active'
              WHEN last_booking_date > NOW() - INTERVAL '60 days' THEN 'attention'
              ELSE 'critical'
          END as status
      FROM client_bookings
  )
  SELECT 
      n.id,
      n.name,
      n.description,
      COALESCE(n.target_clients, 0) as target_clients,
      COUNT(cs.network_id)::INTEGER as total_registered,
      COUNT(CASE WHEN cs.status = 'active' THEN 1 END)::INTEGER as active_count,
      COUNT(CASE WHEN cs.status = 'attention' THEN 1 END)::INTEGER as attention_count,
      COUNT(CASE WHEN cs.status = 'critical' THEN 1 END)::INTEGER as critical_count,
      COUNT(CASE WHEN cs.status = 'no_booking' THEN 1 END)::INTEGER as no_booking_count
  FROM networks n
  LEFT JOIN client_status cs ON n.id = cs.network_id
  GROUP BY n.id, n.name, n.description, n.target_clients
  ORDER BY n.name;
END;
$$ LANGUAGE plpgsql;
