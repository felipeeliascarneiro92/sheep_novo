
-- Add payment tracking columns to the tasks table
ALTER TABLE tasks 
ADD COLUMN is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN payout_date TIMESTAMP WITH TIME ZONE;

-- Update existing completed tasks to be unpaid by default (already handled by default false, but good to be explicit if needed)
-- UPDATE tasks SET is_paid = FALSE WHERE is_paid IS NULL;
