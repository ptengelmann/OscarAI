-- Create claude_insights table for caching AI-generated insights
CREATE TABLE IF NOT EXISTS claude_insights (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  insight_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  title TEXT NOT NULL,
  claude_analysis TEXT NOT NULL,
  strategic_recommendations JSONB NOT NULL,
  immediate_actions JSONB NOT NULL,
  revenue_impact_estimate DOUBLE PRECISION NOT NULL,
  confidence_score DOUBLE PRECISION NOT NULL,
  affected_products JSONB NOT NULL,
  competitors_involved JSONB NOT NULL,
  market_context TEXT NOT NULL,
  urgency_timeline TEXT NOT NULL,
  analysis_depth TEXT NOT NULL DEFAULT 'standard',
  data_snapshot JSONB NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claude_insights_user_expires ON claude_insights(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_claude_insights_user_generated ON claude_insights(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_claude_insights_type_priority ON claude_insights(insight_type, priority);
