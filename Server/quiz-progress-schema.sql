-- Quiz Progress Database Schema for MINDMORPH
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Quiz Attempts Table
-- Stores each quiz attempt with overall information
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  topic VARCHAR(200),
  learning_type VARCHAR(50), -- 'visual', 'audio', 'text'
  difficulty VARCHAR(20), -- 'easy', 'medium', 'hard'
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
  time_taken INTEGER, -- Time in seconds
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Quiz Responses Table
-- Stores individual question responses for each quiz attempt
CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL, -- The question ID from the quiz
  question_text TEXT NOT NULL,
  question_type VARCHAR(50), -- 'multiple_choice', 'true_false', 'short_answer'
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_subject ON quiz_attempts(subject);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_attempt_id ON quiz_responses(quiz_attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_question_id ON quiz_responses(question_id);

-- Optional: Add a view for easy querying of quiz progress with responses
CREATE OR REPLACE VIEW quiz_progress_view AS
SELECT 
  qa.id as attempt_id,
  qa.user_id,
  qa.subject,
  qa.topic,
  qa.learning_type,
  qa.difficulty,
  qa.total_questions,
  qa.correct_answers,
  qa.score,
  qa.time_taken,
  qa.completed_at,
  qa.created_at,
  json_agg(
    json_build_object(
      'id', qr.id,
      'question_id', qr.question_id,
      'question_text', qr.question_text,
      'question_type', qr.question_type,
      'user_answer', qr.user_answer,
      'correct_answer', qr.correct_answer,
      'is_correct', qr.is_correct,
      'explanation', qr.explanation
    ) ORDER BY qr.question_id
  ) as responses
FROM quiz_attempts qa
LEFT JOIN quiz_responses qr ON qa.id = qr.quiz_attempt_id
GROUP BY qa.id, qa.user_id, qa.subject, qa.topic, qa.learning_type, 
         qa.difficulty, qa.total_questions, qa.correct_answers, 
         qa.score, qa.time_taken, qa.completed_at, qa.created_at;

