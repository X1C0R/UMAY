/**
 * AI Content Generation API Routes
 * Generates personalized learning content based on ML recommendations
 */

import express from "express";
import * as aiService from "./ai-content-service.js";
import * as mlServices from "./ml-services.js";

const router = express.Router();

/**
 * POST /api/ai/generate-content
 * Generate personalized content based on ML-analyzed learning type
 * This is the main endpoint that connects ML analysis to AI content generation
 */
router.post("/generate-content", async (req, res) => {
  try {
    const userId = req.userId;
    let { subject, topic, difficulty } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Fallback: if topic is null/undefined, use subject as topic
    if (!topic && subject) {
      topic = subject;
      console.log(`[AI Routes] Topic was null/undefined, using subject as topic: ${subject}`);
    }

    if (!subject || !topic) {
      return res.status(400).json({ error: "Subject and topic are required" });
    }

    // Step 1: Get ML recommendation for learning mode
    const mlRecommendation = await mlServices.recommendLearningMode(userId, subject);
    const recommendedMode = mlRecommendation.recommendedMode || "visual";

    // Step 2: Generate AI content based on recommended learning mode
    const content = await aiService.generatePersonalizedContent(
      userId,
      subject,
      topic,
      recommendedMode,
      difficulty || "medium"
    );

    res.json({
      success: true,
      content: content,
      learningMode: recommendedMode,
      mlConfidence: mlRecommendation.confidence,
      mlReasoning: mlRecommendation.reasoning,
    });
  } catch (error) {
    console.error("Error generating content:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate content";
    if (error.message?.includes("API key") || error.message?.includes("not configured")) {
      // Detect provider from error message - only detect Ollama if explicitly mentioned
      if (error.message?.includes("Ollama") && (error.message?.includes("connection refused") || error.message?.includes("ECONNREFUSED") || error.message?.includes("Cannot connect to Ollama"))) {
        errorMessage = "Ollama is not running. Install Ollama from https://ollama.ai, then run: ollama pull llama3.2";
      } else if (error.message?.includes("Google") || error.message?.includes("Gemini") || error.message?.includes("AIza") || error.message?.includes("quota") || error.message?.includes("rate limit")) {
        errorMessage = "Google Gemini API key not configured. Please set GOOGLE_AI_API_KEY in server .env file. Get free key at: https://makersuite.google.com/app/apikey";
      } else if (error.message?.includes("OpenAI") || error.message?.includes("sk-")) {
        errorMessage = "OpenAI API key not configured. Please set OPENAI_API_KEY in server .env file.";
      } else {
        errorMessage = "AI API key not configured. Please set GOOGLE_AI_API_KEY (free), OPENAI_API_KEY, or use Ollama (local, free) by setting AI_PROVIDER=ollama in server .env file.";
      }
    } else if (error.message?.includes("quota") || error.message?.includes("insufficient")) {
      if (error.message?.includes("Google") || error.message?.includes("Gemini")) {
        errorMessage = "Google Gemini API quota exceeded. Free tier: 60 requests/min, 1,500/day. Wait a moment or check usage at: https://makersuite.google.com/app/apikey";
      } else {
        errorMessage = "AI API quota exceeded. Please add credits to your account or wait a moment.";
      }
    } else if (error.message?.includes("rate limit")) {
      errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
    } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
      errorMessage = "Network error. Please check your internet connection.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: error.message || "An unexpected error occurred"
    });
  }
});

/**
 * POST /api/ai/generate-content-for-mode
 * Generate content for a specific learning mode (override ML recommendation)
 */
router.post("/generate-content-for-mode", async (req, res) => {
  try {
    const userId = req.userId;
    let { subject, topic, learningMode, difficulty } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Fallback: if topic is null/undefined, use subject as topic
    if (!topic && subject) {
      topic = subject;
      console.log(`[AI Routes] Topic was null/undefined, using subject as topic: ${subject}`);
    }

    if (!subject || !topic || !learningMode) {
      return res.status(400).json({ 
        error: "Subject, topic, and learningMode are required" 
      });
    }

    const content = await aiService.generatePersonalizedContent(
      userId,
      subject,
      topic,
      learningMode,
      difficulty || "medium"
    );

    res.json({
      success: true,
      content: content,
      learningMode: learningMode,
    });
  } catch (error) {
    console.error("Error generating content:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate content";
    if (error.message?.includes("API key") || error.message?.includes("not configured")) {
      // Detect provider from error message - only detect Ollama if explicitly mentioned
      if (error.message?.includes("Ollama") && (error.message?.includes("connection refused") || error.message?.includes("ECONNREFUSED") || error.message?.includes("Cannot connect to Ollama"))) {
        errorMessage = "Ollama is not running. Install Ollama from https://ollama.ai, then run: ollama pull llama3.2";
      } else if (error.message?.includes("Google") || error.message?.includes("Gemini") || error.message?.includes("AIza") || error.message?.includes("quota") || error.message?.includes("rate limit")) {
        errorMessage = "Google Gemini API key not configured. Please set GOOGLE_AI_API_KEY in server .env file. Get free key at: https://makersuite.google.com/app/apikey";
      } else if (error.message?.includes("OpenAI") || error.message?.includes("sk-")) {
        errorMessage = "OpenAI API key not configured. Please set OPENAI_API_KEY in server .env file.";
      } else {
        errorMessage = "AI API key not configured. Please set GOOGLE_AI_API_KEY (free), OPENAI_API_KEY, or use Ollama (local, free) by setting AI_PROVIDER=ollama in server .env file.";
      }
    } else if (error.message?.includes("quota") || error.message?.includes("insufficient")) {
      if (error.message?.includes("Google") || error.message?.includes("Gemini")) {
        errorMessage = "Google Gemini API quota exceeded. Free tier: 60 requests/min, 1,500/day. Wait a moment or check usage at: https://makersuite.google.com/app/apikey";
      } else {
        errorMessage = "AI API quota exceeded. Please add credits to your account or wait a moment.";
      }
    } else if (error.message?.includes("rate limit")) {
      errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
    } else if (error.message?.includes("503") || error.message?.includes("overloaded") || error.message?.includes("UNAVAILABLE")) {
      errorMessage = "The AI model is temporarily overloaded. The system will retry automatically. If this persists, please try again in a few moments.";
    } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
      errorMessage = "Network error. Please check your internet connection.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: error.message || "An unexpected error occurred"
    });
  }
});

/**
 * POST /api/ai/generate-quiz
 * Generate quiz questions based on learning mode
 */
router.post("/generate-quiz", async (req, res) => {
  try {
    const userId = req.userId;
    let { subject, topic, learningMode, difficulty, numQuestions, content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Fallback: if topic is null/undefined, use subject as topic
    if (!topic && subject) {
      topic = subject;
      console.log(`[AI Routes] Topic was null/undefined, using subject as topic: ${subject}`);
    }

    if (!subject || !topic) {
      return res.status(400).json({ error: "Subject and topic are required" });
    }

    // If learningMode not provided, get from ML recommendation
    let mode = learningMode;
    if (!mode) {
      const mlRecommendation = await mlServices.recommendLearningMode(userId, subject);
      mode = mlRecommendation.recommendedMode || "visual";
    }

    // If content is provided, use it to generate context-aware questions
    // Otherwise, try to fetch the most recent content for this topic
    let contentToUse = content;
    if (!contentToUse) {
      try {
        // Try to get the most recent generated content for this topic
        const generatedContent = await aiService.generatePersonalizedContent(
          userId,
          subject,
          topic,
          mode,
          difficulty || "medium"
        );
        contentToUse = generatedContent;
      } catch (contentError) {
        console.warn("Could not fetch content for quiz context, generating without it:", contentError.message);
        // Continue without content - will use generic prompt
      }
    }

    const quiz = await aiService.generateQuizQuestions(
      subject,
      topic,
      mode,
      difficulty || "medium",
      numQuestions || 5,
      contentToUse // Pass content to quiz generation
    );

    res.json({
      success: true,
      quiz: quiz,
      learningMode: mode,
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    res.status(500).json({ 
      error: "Failed to generate quiz",
      message: error.message 
    });
  }
});

/**
 * GET /api/ai/study-summary
 * Generate personalized study summary
 */
router.get("/study-summary", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject, learningMode } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!subject) {
      return res.status(400).json({ error: "Subject is required" });
    }

    // If learningMode not provided, get from ML recommendation
    let mode = learningMode;
    if (!mode) {
      const mlRecommendation = await mlServices.recommendLearningMode(userId, subject);
      mode = mlRecommendation.recommendedMode || "visual";
    }

    const summary = await aiService.generateStudySummary(userId, subject, mode);

    res.json({
      success: true,
      summary: summary,
      learningMode: mode,
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({ 
      error: "Failed to generate summary",
      message: error.message 
    });
  }
});

/**
 * POST /api/ai/explain-answer
 * Generate explanation for wrong answers
 */
router.post("/explain-answer", async (req, res) => {
  try {
    const userId = req.userId;
    const { question, userAnswer, correctAnswer, learningMode, subject } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!question || !userAnswer || !correctAnswer || !subject) {
      return res.status(400).json({ 
        error: "Question, userAnswer, correctAnswer, and subject are required" 
      });
    }

    // If learningMode not provided, get from ML recommendation
    let mode = learningMode;
    if (!mode) {
      const mlRecommendation = await mlServices.recommendLearningMode(userId, subject);
      mode = mlRecommendation.recommendedMode || "visual";
    }

    const explanation = await aiService.generateExplanation(
      question,
      userAnswer,
      correctAnswer,
      mode,
      subject
    );

    res.json({
      success: true,
      explanation: explanation,
      learningMode: mode,
    });
  } catch (error) {
    console.error("Error generating explanation:", error);
    res.status(500).json({ 
      error: "Failed to generate explanation",
      message: error.message 
    });
  }
});

/**
 * POST /api/ai/generate-topics
 * Generate topics for a subject based on learning type
 */
router.post("/generate-topics", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject, learningType, numTopics } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!subject || !learningType) {
      return res.status(400).json({ 
        error: "Subject and learningType are required" 
      });
    }

    // Validate learningType
    const validLearningTypes = ['visual', 'audio', 'text'];
    if (!validLearningTypes.includes(learningType.toLowerCase())) {
      return res.status(400).json({ 
        error: "learningType must be one of: visual, audio, text" 
      });
    }

    const topics = await aiService.generateTopics(
      subject,
      learningType.toLowerCase(),
      numTopics || 10
    );

    res.json({
      success: true,
      topics: topics,
      learningType: learningType.toLowerCase(),
    });
  } catch (error) {
    console.error("Error generating topics:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate topics";
    if (error.message?.includes("API key") || error.message?.includes("not configured")) {
      if (error.message?.includes("Ollama") && (error.message?.includes("connection refused") || error.message?.includes("ECONNREFUSED"))) {
        errorMessage = "Ollama is not running. Install Ollama from https://ollama.ai, then run: ollama pull llama3.2";
      } else if (error.message?.includes("Google") || error.message?.includes("Gemini")) {
        errorMessage = "Google Gemini API key not configured. Please set GOOGLE_AI_API_KEY in server .env file.";
      } else if (error.message?.includes("OpenAI")) {
        errorMessage = "OpenAI API key not configured. Please set OPENAI_API_KEY in server .env file.";
      } else {
        errorMessage = "AI API key not configured. Please set GOOGLE_AI_API_KEY (free), OPENAI_API_KEY, or use Ollama (local, free) by setting AI_PROVIDER=ollama in server .env file.";
      }
    } else if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
      errorMessage = "AI API quota/rate limit exceeded. Please wait a moment and try again.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: error.message || "An unexpected error occurred"
    });
  }
});

export default router;

