-- AlterTable to add comment documentation for evaluation metrics and parameters
COMMENT ON COLUMN "public"."evaluations"."metrics" IS 'Stores evaluation metrics including:
- chartImageUrl: URL to the stored chart image in Supabase
- profitLoss: Profit/loss percentage for the evaluation
- confidence: AI confidence level (0-100)
- prediction: AI prediction (buy/sell/hold)
- insights: Array of AI insights and explanations';

COMMENT ON COLUMN "public"."evaluations"."parameters" IS 'Stores evaluation parameters including:
- timeframe: Trading timeframe used (M1, M5, H1, etc.)
- evaluatedAt: ISO timestamp of evaluation
- strategyName: Name of the strategy used
- strategyType: Type of strategy
- candlesAnalyzed: Number of candles analyzed (typically 400)';

-- Create a view to make chart data more accessible
CREATE OR REPLACE VIEW public.evaluation_charts AS
SELECT 
  e.id,
  e.bot_id,
  e.start_date,
  e.end_date,
  e.metrics->>'chartImageUrl' as chart_image_url,
  e.metrics->>'prediction' as prediction,
  (e.metrics->>'confidence')::integer as confidence,
  e.metrics->>'insights' as insights,
  (e.parameters->>'candlesAnalyzed')::integer as candles_analyzed,
  e.parameters->>'timeframe' as timeframe,
  e.parameters->>'strategyName' as strategy_name,
  e.created_at
FROM 
  public.evaluations e
ORDER BY
  e.start_date DESC;

-- Grant permissions on the view
GRANT SELECT ON public.evaluation_charts TO public;
