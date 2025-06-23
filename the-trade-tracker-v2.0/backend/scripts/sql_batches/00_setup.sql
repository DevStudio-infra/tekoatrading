-- Trading Pairs Setup SQL
-- Generated on 2025-05-16T11:53:07.857Z
-- Run this file FIRST to prepare the database

-- First, truncate the table to start fresh
TRUNCATE TABLE public.trading_pairs RESTART IDENTITY CASCADE;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON public.trading_pairs(broker_name);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON public.trading_pairs(type);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON public.trading_pairs(category);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_is_active ON public.trading_pairs(is_active);

-- Verify empty table
SELECT COUNT(*) FROM public.trading_pairs;
