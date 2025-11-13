/**
 * ML/AI API Routes for MINDMORPH
 * Provides endpoints for machine learning features
 */

import express from "express";
import * as mlServices from "./ml-services.js";

const router = express.Router();

/**
 * GET /api/ml/recommend-mode
 * Get recommended learning mode for user
 */
router.get("/recommend-mode", async (req, res) => {
  try {
    const userId = req.userId; // From authenticateToken middleware
    const { subject } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const recommendation = await mlServices.recommendLearningMode(userId, subject);

    res.json({
      success: true,
      recommendation: recommendation,
    });
  } catch (error) {
    console.error("Error in recommend-mode:", error);
    res.status(500).json({ error: "Failed to generate recommendation" });
  }
});

/**
 * GET /api/ml/learning-path
 * Get optimized learning path for user
 */
router.get("/learning-path", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const path = await mlServices.optimizeLearningPath(userId, subject);

    res.json({
      success: true,
      learningPath: path,
    });
  } catch (error) {
    console.error("Error in learning-path:", error);
    res.status(500).json({ error: "Failed to generate learning path" });
  }
});

/**
 * POST /api/ml/predict-performance
 * Predict user's future performance
 */
router.post("/predict-performance", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject, upcomingTopics } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const prediction = await mlServices.predictPerformance(
      userId,
      subject,
      upcomingTopics
    );

    res.json({
      success: true,
      prediction: prediction,
    });
  } catch (error) {
    console.error("Error in predict-performance:", error);
    res.status(500).json({ error: "Failed to generate prediction" });
  }
});

/**
 * GET /api/ml/engagement
 * Analyze user engagement and provide insights
 */
router.get("/engagement", async (req, res) => {
  try {
    const userId = req.userId;
    const days = parseInt(req.query.days) || 7;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const analysis = await mlServices.analyzeEngagement(userId, days);

    res.json({
      success: true,
      engagement: analysis,
    });
  } catch (error) {
    console.error("Error in engagement:", error);
    res.status(500).json({ error: "Failed to analyze engagement" });
  }
});

/**
 * GET /api/ml/recommend-content
 * Get personalized content recommendations
 */
router.get("/recommend-content", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const recommendations = await mlServices.recommendContent(userId, subject);

    res.json({
      success: true,
      recommendations: recommendations,
    });
  } catch (error) {
    console.error("Error in recommend-content:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

/**
 * POST /api/ml/adaptive-difficulty
 * Calculate adaptive quiz difficulty
 */
router.post("/adaptive-difficulty", async (req, res) => {
  try {
    const userId = req.userId;
    const { recentScores, currentDifficulty } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const difficulty = mlServices.calculateAdaptiveDifficulty(
      recentScores,
      currentDifficulty
    );

    res.json({
      success: true,
      difficulty: difficulty,
    });
  } catch (error) {
    console.error("Error in adaptive-difficulty:", error);
    res.status(500).json({ error: "Failed to calculate difficulty" });
  }
});

export default router;


