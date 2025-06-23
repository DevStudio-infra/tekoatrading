-- Fix BTC confidence threshold
-- This script lowers the confidence threshold for strategies used by BTC bots

-- First, let's see current bot configurations
SELECT
    b.name as bot_name,
    b.trading_pair_symbol,
    s.name as strategy_name,
    s.confidence_threshold
FROM bots b
JOIN strategies s ON b.strategy_id = s.id
WHERE b.trading_pair_symbol LIKE '%BTC%';

-- Update confidence threshold for strategies used by BTC bots
UPDATE strategies
SET confidence_threshold = 45
WHERE id IN (
    SELECT DISTINCT b.strategy_id
    FROM bots b
    WHERE b.trading_pair_symbol LIKE '%BTC%'
    AND EXISTS (
        SELECT 1 FROM strategies s
        WHERE s.id = b.strategy_id
        AND s.confidence_threshold > 50
    )
);

-- Verify the changes
SELECT
    b.name as bot_name,
    b.trading_pair_symbol,
    s.name as strategy_name,
    s.confidence_threshold as new_threshold
FROM bots b
JOIN strategies s ON b.strategy_id = s.id
WHERE b.trading_pair_symbol LIKE '%BTC%';
