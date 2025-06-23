
          -- Batch 194/195
          INSERT INTO public.trading_pairs (
            symbol, name, description, market_id, type, category, 
            broker_name, is_active, metadata, last_updated, created_at
          )
          VALUES
          ('AUD/USD', 'Australian Dollar/US Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T13:44:02.774Z'::timestamp, '2025-04-21T13:44:02.774Z'::timestamp),
('USD/CHF', 'US Dollar/Swiss Franc', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T13:44:02.774Z'::timestamp, '2025-04-21T13:44:02.774Z'::timestamp),
('USD/CAD', 'US Dollar/Canadian Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T13:44:02.774Z'::timestamp, '2025-04-21T13:44:02.774Z'::timestamp),
('NZD/USD', 'New Zealand Dollar/US Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T13:44:02.774Z'::timestamp, '2025-04-21T13:44:02.774Z'::timestamp),
('EUR/GBP', 'Euro/British Pound', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T13:44:02.774Z'::timestamp, '2025-04-21T13:44:02.774Z'::timestamp),
('EUR/JPY', 'Euro/Japanese Yen', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T13:44:02.774Z'::timestamp, '2025-04-21T13:44:02.774Z'::timestamp),
('GBP/JPY', 'British Pound/Japanese Yen', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T13:44:02.774Z'::timestamp, '2025-04-21T13:44:02.774Z'::timestamp),
('EUR/CHF', 'Euro/Swiss Franc', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('EUR/AUD', 'Euro/Australian Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('EUR/CAD', 'Euro/Canadian Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('GBP/CHF', 'British Pound/Swiss Franc', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('GBP/AUD', 'British Pound/Australian Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('AUD/JPY', 'Australian Dollar/Japanese Yen', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('AUD/CAD', 'Australian Dollar/Canadian Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('AUD/NZD', 'Australian Dollar/New Zealand Dollar', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('AUD/CHF', 'Australian Dollar/Swiss Franc', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('NZD/JPY', 'New Zealand Dollar/Japanese Yen', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('CAD/JPY', 'Canadian Dollar/Japanese Yen', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('CAD/CHF', 'Canadian Dollar/Swiss Franc', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp),
('CHF/JPY', 'Swiss Franc/Japanese Yen', NULL, NULL, 'forex', 'Forex', 'Capital.com', true, NULL, '2025-04-21T14:08:42.595Z'::timestamp, '2025-04-21T14:08:42.595Z'::timestamp)
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
        