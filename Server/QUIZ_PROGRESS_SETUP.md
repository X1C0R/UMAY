# Quiz Progress Saving - Setup Instructions

## Overview
The quiz progress saving feature now stores detailed information about each quiz attempt, including individual question responses. This allows for better tracking, analysis, and personalized learning recommendations.

## Database Setup

1. **Run the SQL Schema**
   - Open your Supabase SQL Editor
   - Run the SQL commands from `quiz-progress-schema.sql`
   - This will create two tables:
     - `quiz_attempts` - Stores overall quiz attempt information
     - `quiz_responses` - Stores individual question responses

## What Gets Saved

### Quiz Attempt Data
- User ID
- Subject and Topic
- Learning Type (visual/audio/text)
- Difficulty Level
- Total Questions and Correct Answers
- Score (percentage)
- Time Taken (optional)
- Timestamp

### Individual Question Responses
- Question ID and Text
- Question Type (multiple_choice, true_false, short_answer)
- User's Answer
- Correct Answer
- Whether the answer was correct
- Explanation (if available)

## API Endpoint

### POST `/quiz-progress`
Saves detailed quiz progress including all question responses.

**Request Body:**
```json
{
  "subject": "math",
  "topic": "Algebra Basics",
  "learning_type": "visual",
  "difficulty": "medium",
  "total_questions": 5,
  "correct_answers": 4,
  "score": 80.0,
  "time_taken": 300,
  "responses": [
    {
      "question_id": 1,
      "question_text": "What is 2 + 2?",
      "question_type": "multiple_choice",
      "user_answer": "4",
      "correct_answer": "4",
      "is_correct": true,
      "explanation": "Basic addition"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz progress saved successfully",
  "quiz_attempt": { ... },
  "responses_count": 5
}
```

## Backward Compatibility

The system maintains backward compatibility by:
- Still logging to `activity_logs` table (for ML analysis)
- The existing `/activity` endpoint continues to work
- ML services can still read from `activity_logs` as before

## Benefits

1. **Detailed Progress Tracking** - See exactly which questions users struggle with
2. **Better Analytics** - Analyze patterns in incorrect answers
3. **Personalized Learning** - Identify knowledge gaps per topic
4. **Historical Data** - Users can review their past quiz attempts
5. **ML Enhancement** - More data for machine learning models to learn from

## Querying Quiz Progress

You can query quiz progress using the `quiz_progress_view`:

```sql
-- Get all quiz attempts for a user
SELECT * FROM quiz_progress_view 
WHERE user_id = 'user-uuid-here'
ORDER BY completed_at DESC;

-- Get quiz attempts for a specific subject
SELECT * FROM quiz_progress_view 
WHERE user_id = 'user-uuid-here' 
  AND subject = 'math'
ORDER BY completed_at DESC;
```

## Next Steps

Consider adding:
- Endpoint to retrieve quiz history for a user
- Endpoint to get statistics (average scores, weak topics, etc.)
- UI to display quiz history and progress
- Export functionality for quiz data



