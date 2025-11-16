/**
 * Quiz API Routes for MINDMORPH
 * Handles saving quiz results to quiz_results table (simplified schema without attempts)
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Initialize Supabase client (will be passed from server.js)
let supabaseClient = null;

export function initializeQuizRoutes(supabase) {
  supabaseClient = supabase;
}

/**
 * POST /api/quiz/save
 * Save quiz result to quiz_results table (includes all responses in JSONB)
 */
router.post("/save", async (req, res) => {
  try {
    const userId = req.userId;
    const {
      subject,
      topic,
      learningType,
      difficulty,
      totalQuestions,
      correctAnswers,
      score,
      timeTaken,
      responses, // Array of question responses
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!subject || !totalQuestions || !responses || !Array.isArray(responses)) {
      return res.status(400).json({
        error: "Subject, totalQuestions, and responses array are required",
      });
    }

    // Validate learning type
    const validLearningTypes = ["visual", "audio", "text"];
    const normalizedLearningType = learningType
      ? learningType.toLowerCase()
      : "text";
    if (learningType && !validLearningTypes.includes(normalizedLearningType)) {
      return res.status(400).json({
        error: "learningType must be one of: visual, audio, text",
      });
    }

    // Calculate score if not provided
    const calculatedScore =
      score !== undefined
        ? parseFloat(score)
        : (correctAnswers / totalQuestions) * 100;

    // Format responses for JSONB storage
    const formattedResponses = responses.map((response) => ({
      question_id: response.question_id || response.questionId || 0,
      question_text: response.question_text || response.questionText || "",
      question_type: response.question_type || response.questionType || "multiple_choice",
      user_answer: response.user_answer || response.userAnswer || null,
      correct_answer: response.correct_answer || response.correctAnswer || "",
      is_correct: response.is_correct !== undefined ? response.is_correct : response.isCorrect || false,
      explanation: response.explanation || null,
    }));

    // Insert quiz result (single record with responses in JSONB)
    const { data: quizResult, error: resultError } = await supabaseClient
      .from("quiz_results")
      .insert({
        user_id: userId,
        subject: subject.toLowerCase(),
        topic: topic ? topic.toLowerCase() : null,
        learning_type: normalizedLearningType,
        difficulty: difficulty || "medium",
        total_questions: totalQuestions,
        correct_answers: correctAnswers || 0,
        score: calculatedScore,
        time_taken: timeTaken || null,
        responses: formattedResponses, // Store as JSONB
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (resultError) {
      console.error("Error saving quiz result:", resultError);
      console.error("Full error details:", JSON.stringify(resultError, null, 2));
      
      // Check if table doesn't exist
      if (resultError.code === "42P01" || resultError.message?.includes("does not exist")) {
        return res.status(500).json({
          error: "Database table not found",
          message: "The quiz_results table does not exist. Please run the SQL schema in Supabase.",
          details: resultError.message || "Table 'quiz_results' not found",
          code: resultError.code || "TABLE_NOT_FOUND",
          hint: "Run the SQL from Server/quiz-schema.sql in your Supabase SQL Editor",
        });
      }
      
      return res.status(500).json({
        error: "Failed to save quiz result",
        message: resultError.message || "Database error",
        details: resultError.details || resultError.message || "Unknown error",
        code: resultError.code || "UNKNOWN_ERROR",
      });
    }

    console.log(`✅ Quiz saved: Result ${quizResult.id} with ${formattedResponses.length} responses`);

    res.json({
      success: true,
      message: "Quiz saved successfully",
      quizResult: {
        id: quizResult.id,
        subject: quizResult.subject,
        topic: quizResult.topic,
        learningType: quizResult.learning_type,
        score: quizResult.score,
        totalQuestions: quizResult.total_questions,
        correctAnswers: quizResult.correct_answers,
        completedAt: quizResult.completed_at,
      },
      responsesCount: formattedResponses.length,
    });
  } catch (error) {
    console.error("Error saving quiz:", error);
    res.status(500).json({
      error: "Failed to save quiz",
      message: error.message,
    });
  }
});

/**
 * GET /api/quiz/history
 * Get quiz history for a user (optionally filtered by subject)
 */
router.get("/history", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let query = supabaseClient
      .from("quiz_results")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(parseInt(limit) || 20);

    if (subject) {
      query = query.eq("subject", subject.toLowerCase());
    }

    const { data: results, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      results: results || [],
      count: results?.length || 0,
    });
  } catch (error) {
    console.error("Error getting quiz history:", error);
    res.status(500).json({
      error: "Failed to get quiz history",
      message: error.message,
    });
  }
});

/**
 * GET /api/quiz/result/:resultId
 * Get detailed quiz result with all responses
 */
router.get("/result/:resultId", async (req, res) => {
  try {
    const userId = req.userId;
    const { resultId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get quiz result (responses are already in JSONB)
    const { data: result, error: resultError } = await supabaseClient
      .from("quiz_results")
      .select("*")
      .eq("id", resultId)
      .eq("user_id", userId)
      .single();

    if (resultError) throw resultError;

    if (!result) {
      return res.status(404).json({ error: "Quiz result not found" });
    }

    res.json({
      success: true,
      result: result,
      responses: result.responses || [], // Responses are in JSONB field
    });
  } catch (error) {
    console.error("Error getting quiz result:", error);
    res.status(500).json({
      error: "Failed to get quiz result",
      message: error.message,
    });
  }
});

/**
 * GET /api/quiz/latest
 * Get the latest quiz result for a specific subject and topic
 */
router.get("/latest", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject, topic } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!subject) {
      return res.status(400).json({ error: "Subject is required" });
    }

    let query = supabaseClient
      .from("quiz_results")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", subject.toLowerCase())
      .order("completed_at", { ascending: false })
      .limit(1);

    if (topic) {
      query = query.eq("topic", topic.toLowerCase());
    }

    const { data: results, error } = await query;

    if (error) throw error;

    if (!results || results.length === 0) {
      return res.json({
        success: true,
        result: null,
        message: "No quiz result found",
      });
    }

    const result = results[0];
    res.json({
      success: true,
      result: result,
      responses: result.responses || [], // Responses are in JSONB field
    });
  } catch (error) {
    console.error("Error getting latest quiz result:", error);
    res.status(500).json({
      error: "Failed to get latest quiz result",
      message: error.message,
    });
  }
});

export default router;

