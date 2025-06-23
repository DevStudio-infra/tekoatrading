
          -- Batch 195/195
          INSERT INTO public.trading_pairs (
            symbol, name, description, market_id, type, category, 
            broker_name, is_active, metadata, last_updated, created_at
          )
          VALUES
          ('GBP/CAD', 'British Pound/Canadian Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('GBP/NZD', 'British Pound/New Zealand Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('USD/SGD', 'US Dollar/Singapore Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('USD/HKD', 'US Dollar/Hong Kong Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('USD/MXN', 'US Dollar/Mexican Peso', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('USD/ZAR', 'US Dollar/South African Rand', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('USD/TRY', 'US Dollar/Turkish Lira', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('ETH/USD', 'Ethereum vs US Dollar', 'Ethereum cryptocurrency against USD', 'ETHUSD', 'cryptocurrency', 'Crypto', 'capital.com', true, '{"epic":"ETHUSD"}'::jsonb, '2025-04-29T21:11:58.198Z'::timestamp, '2025-04-29T21:11:58.198Z'::timestamp),
('BTC/USD', 'Bitcoin vs US Dollar', 'Bitcoin cryptocurrency against USD', 'BTCUSD', 'cryptocurrency', 'Crypto', 'capital.com', true, '{"epic":"BTCUSD"}'::jsonb, '2025-04-29T21:11:58.198Z'::timestamp, '2025-04-29T21:11:58.198Z'::timestamp),
('EUR/USD', 'Euro vs US Dollar', 'Euro against US Dollar', 'EURUSD', 'forex', 'Forex', 'capital.com', true, '{"epic":"EURUSD"}'::jsonb, '2025-04-29T21:11:58.198Z'::timestamp, '2025-04-29T21:11:58.198Z'::timestamp),
('GBP/USD', 'Pound/US Dollar', 'British Pound against US Dollar', NULL, 'forex', 'Forex', 'capital.com', true, NULL, '2025-04-30T05:34:31.153Z'::timestamp, '2025-04-30T05:34:31.153Z'::timestamp),
('USD/JPY', 'US Dollar/Japanese Yen', 'US Dollar against Japanese Yen', NULL, 'forex', 'Forex', 'capital.com', true, NULL, '2025-04-30T05:34:31.153Z'::timestamp, '2025-04-30T05:34:31.153Z'::timestamp),
('XAU/USD', 'Gold/US Dollar', 'Gold against US Dollar', NULL, 'commodity', 'Commodities', 'capital.com', true, NULL, '2025-04-30T05:34:31.153Z'::timestamp, '2025-04-30T05:34:31.153Z'::timestamp),
('SPX500', 'S&P 500 Index', 'S&P 500 Index', NULL, 'index', 'Indices', 'capital.com', true, NULL, '2025-04-30T05:34:31.153Z'::timestamp, '2025-04-30T05:34:31.153Z'::timestamp)
          ON CONFLICT (symbol) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            market_id = EXCLUDED.market_id,
            type = EXCLUDED.type,
            category = EXCLUDED.category,
            broker_name = EXCLUDED.broker_name,
            is_active = EXCLUDED.is_active,
            metadata = EXCLUDED.metadata,
            last_updated = EXCLUDED.last_updated;
          
          -- Get current count
          SELECT COUNT(*) FROM public.trading_pairs;
        