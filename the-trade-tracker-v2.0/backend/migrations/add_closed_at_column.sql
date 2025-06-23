-- Add missing closed_at column to trades table
-- This column is needed for tracking when positions are closed

ALTER TABLE trades
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
