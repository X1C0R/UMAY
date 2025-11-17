# Engagement Tracking Setup Guide

## Overview
The engagement tracking feature monitors how users interact with different learning content types:
- **Audio Learning**: Tracks how many times audio is played
- **Visual Learning**: Tracks video play count (for future implementation)
- **Text Learning**: Tracks reading time in seconds

This data is saved to the `adaptivecontent` table and used to calculate confidence scores for personalized learning recommendations.

## Database Setup

1. **Run the SQL Schema Update**
   - Open your Supabase SQL Editor
   - Run the SQL commands from `adaptivecontent-schema-update.sql`
   - This will add the necessary columns to your existing `adaptivecontent` table:
     - `user_id` - Links to the user
     - `topic` - The specific topic being studied
     - `learning_type` - 'visual', 'audio', or 'text'
     - `audio_play_count` - Number of times audio was played
     - `video_play_count` - Number of times video was played (for future use)
     - `reading_time_seconds` - Time spent reading text content
     - `created_at` and `updated_at` - Timestamps

## How It Works

### Audio Learning
- Each time the user clicks play on an audio file, the play count increments
- Tracked automatically in the `AudioPlayer` component
- Saved when quiz is submitted

### Text Learning
- Reading time starts when user enters the text learning step
- Tracks time spent on the learning content (updates every second)
- Final reading time is calculated when user moves to quiz or leaves the step
- Saved in seconds when quiz is submitted

### Visual Learning
- Video play count tracking is prepared for future implementation
- Currently set to 0, but infrastructure is ready

## API Endpoint

### POST `/adaptive-content`
Saves or updates engagement data for a user's learning session.

**Request Body:**
```json
{
  "subject": "math",
  "topic": "Algebra Basics",
  "learning_type": "audio",
  "audio_play_count": 3,
  "video_play_count": 0,
  "reading_time_seconds": 0,
  "quiz_score": 85
}
```

**Response:**
```json
{
  "success": true,
  "message": "Engagement data saved successfully",
  "data": {
    "id": 123,
    "user_id": "uuid-here",
    "subject": "math",
    "topic": "Algebra Basics",
    "learning_type": "audio",
    "confidence": 0.82,
    "audio_play_count": 3,
    "video_play_count": 0,
    "reading_time_seconds": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

## Confidence Calculation

The system calculates a confidence score (0.0 to 1.0) based on:
- **40% Engagement Score**: Based on interaction with content
  - Audio: Each play = 20 points (max 100)
  - Text: 10 seconds = 1 point (max 100)
  - Visual: Each video play = 20 points (max 100)
- **60% Quiz Performance**: Based on quiz score (0-100)

**Formula:**
```
confidence = (engagementScore * 0.4 + quizScore * 0.6) / 100
```

## Data Flow

1. User selects learning type and views content
2. Engagement metrics are tracked in real-time:
   - Audio plays are counted immediately
   - Reading time is tracked with a timer
3. When user submits quiz:
   - Final engagement metrics are calculated
   - Data is sent to `/adaptive-content` endpoint
   - System updates or creates record in `adaptivecontent` table
   - Confidence score is calculated and saved

## Benefits

1. **Personalized Recommendations**: Higher confidence = better content match
2. **Engagement Insights**: Understand how users interact with different content types
3. **Performance Analysis**: Combine engagement with quiz scores for better predictions
4. **Adaptive Learning**: System learns which content types work best for each user

## Querying Engagement Data

```sql
-- Get engagement data for a user
SELECT * FROM adaptivecontent 
WHERE user_id = 'user-uuid-here'
ORDER BY updated_at DESC;

-- Get average confidence by learning type
SELECT learning_type, AVG(confidence) as avg_confidence
FROM adaptivecontent
WHERE user_id = 'user-uuid-here'
GROUP BY learning_type;

-- Get users with high engagement
SELECT user_id, subject, learning_type, 
       audio_play_count, reading_time_seconds, confidence
FROM adaptivecontent
WHERE confidence > 0.7
ORDER BY confidence DESC;
```

## Next Steps

Consider adding:
- Real-time engagement tracking (save periodically, not just on quiz submit)
- Video play tracking when video content is implemented
- Engagement analytics dashboard
- ML models that use engagement data for better recommendations




