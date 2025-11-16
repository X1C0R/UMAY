-- Topics Database Schema for MINDMORPH
-- Run these SQL commands in your Supabase SQL Editor
-- This table stores AI-generated topics for each user and subject

-- 1. Topics Table - Stores generated topics for users
CREATE TABLE IF NOT EXISTS user_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  learning_type VARCHAR(20) NOT NULL CHECK (learning_type IN ('visual', 'audio', 'text')),
  topic_id VARCHAR(255) NOT NULL, -- Unique identifier for the topic (from AI generation)
  title VARCHAR(500) NOT NULL,
  description TEXT,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure one topic per user/subject/topic_id combination
  UNIQUE(user_id, subject, topic_id)
);

-- 2. Topic Generation Metadata - Tracks when topics were generated
CREATE TABLE IF NOT EXISTS topic_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  learning_type VARCHAR(20) NOT NULL CHECK (learning_type IN ('visual', 'audio', 'text')),
  num_topics INTEGER NOT NULL DEFAULT 10,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One generation record per user/subject/learning_type
  UNIQUE(user_id, subject, learning_type)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_topics_user_subject ON user_topics(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_user_topics_learning_type ON user_topics(learning_type);
CREATE INDEX IF NOT EXISTS idx_user_topics_created_at ON user_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_generations_user_subject ON topic_generations(user_id, subject);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at for user_topics
CREATE TRIGGER update_user_topics_updated_at 
  BEFORE UPDATE ON user_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

