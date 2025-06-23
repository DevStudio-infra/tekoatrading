-- Trading Pairs Verification SQL
-- Generated on 2025-05-16T11:53:08.075Z
-- Run this file LAST to verify all imports

-- Check total count
SELECT COUNT(*) AS total_pairs FROM public.trading_pairs;

-- Check counts by category
SELECT category, COUNT(*) AS count
FROM public.trading_pairs
GROUP BY category
ORDER BY count DESC;

-- Check counts by broker
SELECT broker_name, COUNT(*) AS count
FROM public.trading_pairs
GROUP BY broker_name
ORDER BY count DESC;

-- Check counts by type
SELECT type, COUNT(*) AS count
FROM public.trading_pairs
GROUP BY type
ORDER BY count DESC;

-- Sample data check - view some random records
SELECT * FROM public.trading_pairs
ORDER BY RANDOM()
LIMIT 10;
