-- Update adaptivecontent table to support engagement tracking
-- Run these SQL commands in your Supabase SQL Editor

-- First, check if user_id column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.adaptivecontent ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add topic column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND column_name = 'topic'
  ) THEN
    ALTER TABLE public.adaptivecontent ADD COLUMN topic TEXT;
  END IF;
END $$;

-- Add learning_type column if it doesn't exist (or rename contentType)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND column_name = 'learning_type'
  ) THEN
    ALTER TABLE public.adaptivecontent ADD COLUMN learning_type TEXT;
  END IF;
END $$;

-- Add engagement tracking columns
DO $$ 
BEGIN
  -- Audio play count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND column_name = 'audio_play_count'
  ) THEN
    ALTER TABLE public.adaptivecontent ADD COLUMN audio_play_count INTEGER DEFAULT 0;
  END IF;
  
  -- Video play count (for future use)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND column_name = 'video_play_count'
  ) THEN
    ALTER TABLE public.adaptivecontent ADD COLUMN video_play_count INTEGER DEFAULT 0;
  END IF;
  
  -- Reading time in seconds
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND column_name = 'reading_time_seconds'
  ) THEN
    ALTER TABLE public.adaptivecontent ADD COLUMN reading_time_seconds INTEGER DEFAULT 0;
  END IF;
  
  -- Timestamp for when engagement was recorded
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.adaptivecontent ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Updated timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.adaptivecontent ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Update the foreign key constraint if needed
-- Remove old constraint if it exists and create new one
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND constraint_name = 'adaptivecontent_subject_fkey'
  ) THEN
    ALTER TABLE public.adaptivecontent DROP CONSTRAINT adaptivecontent_subject_fkey;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_adaptivecontent_user_id ON public.adaptivecontent(user_id);
CREATE INDEX IF NOT EXISTS idx_adaptivecontent_subject_topic ON public.adaptivecontent(subject, topic);
CREATE INDEX IF NOT EXISTS idx_adaptivecontent_learning_type ON public.adaptivecontent(learning_type);
CREATE INDEX IF NOT EXISTS idx_adaptivecontent_created_at ON public.adaptivecontent(created_at DESC);

-- Create a unique constraint to prevent duplicate entries for same user/subject/topic/learning_type
-- This allows updating existing records instead of creating duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'adaptivecontent' 
    AND constraint_name = 'adaptivecontent_user_subject_topic_type_unique'
  ) THEN
    ALTER TABLE public.adaptivecontent 
    ADD CONSTRAINT adaptivecontent_user_subject_topic_type_unique 
    UNIQUE (user_id, subject, topic, learning_type);
  END IF;
END $$;


