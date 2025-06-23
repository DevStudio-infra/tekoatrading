
      -- Verification SQL
      SELECT COUNT(*) AS total_count FROM public.trading_pairs;
      
      -- Category breakdown
      SELECT category, COUNT(*) AS count FROM public.trading_pairs GROUP BY category ORDER BY count DESC;
      
      -- Type breakdown
      SELECT type, COUNT(*) AS count FROM public.trading_pairs GROUP BY type ORDER BY count DESC;
      
      -- Broker breakdown
      SELECT broker_name, COUNT(*) AS count FROM public.trading_pairs GROUP BY broker_name ORDER BY count DESC;
    