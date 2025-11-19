/**
 * Learning Types API Routes for MINDMORPH
 * Handles checking if user has completed all learning type tests
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Initialize Supabase client (will be passed from server.js)
let supabaseClient = null;

export function initializeLearningTypesRoutes(supabase) {
  supabaseClient = supabase;
}

/**
 * GET /api/learning-types/check
 * Check if user has completed all learning types (visual, audio, text) for a subject
 * by checking activity_logs for quiz results with activity_type matching each learning type
 */
router.get("/check", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!subject) {
      return res.status(400).json({ error: "Subject is required" });
    }

    // Check for quiz results in activity_logs for each learning type
    // A learning type is considered completed if there's an activity_log entry
    // with activity_type = 'visual'/'audio'/'text' (regardless of quiz_score)
    const learningTypes = ['visual', 'audio', 'text'];
    const completedTypes = [];
    const typeScores = {};
    const normalizedSubject = subject.toLowerCase().trim();

    console.log(`Checking learning types completion for user ${userId}, subject: "${normalizedSubject}"`);

    for (const learningType of learningTypes) {
      // Query activity_logs for this learning type
      // A learning type is considered completed if there's any activity_log entry
      // with activity_type matching the learning type (regardless of quiz_score)
      // This matches the UI logic which shows completion based on totalSessions > 0
      // Note: We use lowercase comparison for subject to handle case variations
      const { data: activities, error } = await supabaseClient
        .from("activity_logs")
        .select("id, quiz_score, activity_type, subject")
        .eq("user_id", userId)
        .eq("subject", normalizedSubject) // Exact match (already normalized to lowercase)
        .eq("activity_type", learningType.toLowerCase())
        .order("session_date", { ascending: false })
        .limit(1);

      if (error) {
        console.error(`❌ Error checking ${learningType} learning type:`, error);
        continue;
      }

      if (activities && activities.length > 0) {
        completedTypes.push(learningType);
        const score = parseFloat(activities[0].quiz_score) || 0;
        typeScores[learningType] = score;
        console.log(`✅ Found completed ${learningType} learning type (quiz_score: ${score})`);
      } else {
        console.log(`❌ No completed ${learningType} learning type found`);
      }
    }

    const allCompleted = completedTypes.length === 3;
    // Check if all completed types have 0 scores
    const allScoresZero = allCompleted && completedTypes.every(type => (typeScores[type] || 0) === 0);
    
    console.log(`📊 Learning types check result: ${completedTypes.length}/3 completed for subject "${normalizedSubject}"`);
    console.log(`   Completed types: [${completedTypes.join(', ')}]`);
    console.log(`   Type scores:`, typeScores);
    console.log(`   All completed: ${allCompleted}`);
    console.log(`   All scores zero: ${allScoresZero}`);

    res.json({
      success: true,
      completed: allCompleted && !allScoresZero, // Only true if all completed AND at least one has score > 0
      completedTypes: completedTypes,
      totalCompleted: completedTypes.length,
      totalRequired: 3,
      allScoresZero: allScoresZero, // Flag to indicate all scores are 0
      typeScores: typeScores, // Include scores for frontend display
    });
  } catch (error) {
    console.error("Error checking learning types:", error);
    res.status(500).json({
      error: "Failed to check learning types",
      message: error.message,
    });
  }
});

export default router;

