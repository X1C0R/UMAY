-- ML/AI Database Schema for MINDMORPH
-- Run these SQL commands in your Supabase SQL Editor

-- 1. ML Recommendations Table (optional - for caching recommendations)
CREATE TABLE IF NOT EXISTS ml_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100),
  recommended_mode VARCHAR(50), -- 'visual', 'audio', 'text'
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, subject)
);

-- 2. ML Predictions Table (optional - for storing predictions)
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100),
  predicted_score INTEGER, -- 0-100
  confidence DECIMAL(3,2),
  factors JSONB, -- Array of factors affecting prediction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Learning Path Progress (optional - for tracking optimized paths)
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100),
  difficulty VARCHAR(20), -- 'easy', 'medium', 'hard'
  current_topic VARCHAR(200),
  next_topics JSONB, -- Array of suggested topics
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Engagement Alerts (optional - for storing engagement insights)
CREATE TABLE IF NOT EXISTS engagement_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50), -- 'low_focus', 'performance_drop', 'low_engagement'
  message TEXT,
  severity VARCHAR(20), -- 'low', 'medium', 'high'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ml_recommendations_user_subject ON ml_recommendations(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_subject ON ml_predictions(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_subject ON learning_paths(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_engagement_alerts_user ON engagement_alerts(user_id, is_read);

-- Optional: Update activity_logs table if it doesn't have these columns
-- ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50);
-- ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS focus_level INTEGER;
-- ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS device_used VARCHAR(50);


