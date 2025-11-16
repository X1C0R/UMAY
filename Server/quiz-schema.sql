-- Quiz Database Schema for MINDMORPH
-- Simplified schema without attempts concept
-- Run these SQL commands in your Supabase SQL Editor

-- Quiz Results Table
-- Stores quiz results with all question responses in a single record
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  topic VARCHAR(200),
  learning_type VARCHAR(50) NOT NULL, -- 'visual', 'audio', 'text'
  difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
  time_taken INTEGER, -- Time in seconds (optional)
  responses JSONB NOT NULL, -- Array of question responses stored as JSON
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_subject ON quiz_results(subject);
CREATE INDEX IF NOT EXISTS idx_quiz_results_learning_type ON quiz_results(learning_type);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at ON quiz_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_subject ON quiz_results(user_id, subject);

-- Example of responses JSONB structure:
-- [
--   {
--     "question_id": 1,
--     "question_text": "What is...?",
--     "question_type": "multiple_choice",
--     "user_answer": "Option A",
--     "correct_answer": "Option B",
--     "is_correct": false,
--     "explanation": "The correct answer is..."
--   },
--   ...
-- ]

