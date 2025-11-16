/**
 * Topics API Routes for MINDMORPH
 * Handles saving, retrieving, and managing AI-generated topics
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Initialize Supabase client (will be passed from server.js)
let supabaseClient = null;

export function initializeTopicsRoutes(supabase) {
  supabaseClient = supabase;
}

/**
 * GET /api/topics
 * Get all topics for a user and subject
 * If user doesn't have topics, check for topics from other users with same learning type and subject
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject, learningType } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!subject) {
      return res.status(400).json({ error: "Subject is required" });
    }

    // First, try to get topics for the current user
    let query = supabaseClient
      .from("user_topics")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", subject.toLowerCase())
      .order("created_at", { ascending: true });

    const { data: userTopics, error: userError } = await query;

    if (userError) throw userError;

    // If user has topics, return them
    if (userTopics && userTopics.length > 0) {
      // Get generation metadata for user
      const { data: generation } = await supabaseClient
        .from("topic_generations")
        .select("*")
        .eq("user_id", userId)
        .eq("subject", subject.toLowerCase())
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      // Format response
      const formattedTopics = userTopics.map((topic) => ({
        id: topic.topic_id,
        title: topic.title,
        description: topic.description,
        learningType: topic.learning_type,
        difficulty: topic.difficulty,
        createdAt: topic.created_at,
      }));

      return res.json({
        success: true,
        topics: formattedTopics,
        learningType: generation?.learning_type || userTopics[0]?.learning_type || null,
        generatedAt: generation?.generated_at || null,
        isShared: false, // User's own topics
      });
    }

    // If user doesn't have topics, check for shared topics from other users
    // Only if learningType is provided (from ML recommendation)
    if (learningType) {
      const validLearningTypes = ["visual", "audio", "text"];
      const normalizedLearningType = learningType.toLowerCase();
      
      if (validLearningTypes.includes(normalizedLearningType)) {
        // Find topics from other users with same learning type and subject
        const { data: sharedTopics, error: sharedError } = await supabaseClient
          .from("user_topics")
          .select("*")
          .neq("user_id", userId) // Exclude current user
          .eq("subject", subject.toLowerCase())
          .eq("learning_type", normalizedLearningType)
          .order("created_at", { ascending: true })
          .limit(20); // Limit to prevent too many results

        if (sharedError) {
          console.warn("Error fetching shared topics:", sharedError);
        }

        // If shared topics found, return them
        if (sharedTopics && sharedTopics.length > 0) {
          // Get the most recent generation metadata for reference
          const { data: referenceGeneration } = await supabaseClient
            .from("topic_generations")
            .select("*")
            .eq("subject", subject.toLowerCase())
            .eq("learning_type", normalizedLearningType)
            .order("generated_at", { ascending: false })
            .limit(1)
            .single();

          // Format response - use unique topics (by topic_id) to avoid duplicates
          const uniqueTopicsMap = new Map();
          sharedTopics.forEach((topic) => {
            if (!uniqueTopicsMap.has(topic.topic_id)) {
              uniqueTopicsMap.set(topic.topic_id, topic);
            }
          });

          const formattedTopics = Array.from(uniqueTopicsMap.values())
            .slice(0, 10) // Limit to 10 topics
            .map((topic) => ({
              id: topic.topic_id,
              title: topic.title,
              description: topic.description,
              learningType: topic.learning_type,
              difficulty: topic.difficulty,
              createdAt: topic.created_at,
            }));

          return res.json({
            success: true,
            topics: formattedTopics,
            learningType: normalizedLearningType,
            generatedAt: referenceGeneration?.generated_at || null,
            isShared: true, // Topics from other users
            message: `Using topics from other users with ${normalizedLearningType} learning type`,
          });
        }
      }
    }

    // No topics found (neither user's own nor shared)
    return res.status(404).json({
      success: false,
      error: "No topics found",
      message: "Topics have not been generated for this subject yet",
      topics: [],
      learningType: null,
      generatedAt: null,
      isShared: false,
    });
  } catch (error) {
    console.error("Error getting topics:", error);
    res.status(500).json({
      error: "Failed to get topics",
      message: error.message,
    });
  }
});

/**
 * POST /api/topics
 * Save generated topics for a user and subject
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject, topics, learningType } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!subject || !topics || !Array.isArray(topics) || !learningType) {
      return res.status(400).json({
        error: "Subject, topics array, and learningType are required",
      });
    }

    // Validate learning type
    const validLearningTypes = ["visual", "audio", "text"];
    if (!validLearningTypes.includes(learningType.toLowerCase())) {
      return res.status(400).json({
        error: "learningType must be one of: visual, audio, text",
      });
    }

    // Check if topics already exist for this user/subject
    const { data: existingTopics, error: checkError } = await supabaseClient
      .from("user_topics")
      .select("topic_id")
      .eq("user_id", userId)
      .eq("subject", subject.toLowerCase())
      .limit(1);

    if (checkError) {
      console.warn("Error checking existing topics:", checkError);
    }

    // If topics exist, return them instead of overwriting
    if (existingTopics && existingTopics.length > 0) {
      // Get all existing topics
      const { data: allExistingTopics, error: fetchError } = await supabaseClient
        .from("user_topics")
        .select("*")
        .eq("user_id", userId)
        .eq("subject", subject.toLowerCase())
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      // Get generation metadata
      const { data: generation } = await supabaseClient
        .from("topic_generations")
        .select("*")
        .eq("user_id", userId)
        .eq("subject", subject.toLowerCase())
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      return res.status(200).json({
        success: true,
        message: "Topics already exist. Returning existing topics.",
        topics: allExistingTopics.map((topic) => ({
          id: topic.topic_id,
          title: topic.title,
          description: topic.description,
          learningType: topic.learning_type,
          difficulty: topic.difficulty,
          createdAt: topic.created_at,
        })),
        learningType: generation?.learning_type || learningType.toLowerCase(),
        alreadyExists: true,
      });
    }

    // Delete existing topics for this user/subject (if any remain)
    // This allows regeneration when explicitly requested
    const { error: deleteError } = await supabaseClient
      .from("user_topics")
      .delete()
      .eq("user_id", userId)
      .eq("subject", subject.toLowerCase());

    if (deleteError) {
      console.warn("Error deleting existing topics:", deleteError);
      // Continue anyway - might be first time generating
    }

    // Insert new topics using upsert to handle any race conditions
    const topicsToInsert = topics.map((topic) => ({
      user_id: userId,
      subject: subject.toLowerCase(),
      learning_type: learningType.toLowerCase(),
      topic_id: topic.id || `topic-${Date.now()}-${Math.random()}`,
      title: topic.title,
      description: topic.description || null,
      difficulty: topic.difficulty || "medium",
    }));

    // Use upsert to avoid duplicate key errors
    const { data: insertedTopics, error: insertError } = await supabaseClient
      .from("user_topics")
      .upsert(topicsToInsert, {
        onConflict: "user_id,subject,topic_id",
        ignoreDuplicates: false, // Update if exists
      })
      .select();

    if (insertError) throw insertError;

    // Update or create generation metadata
    const { error: upsertError } = await supabaseClient
      .from("topic_generations")
      .upsert(
        {
          user_id: userId,
          subject: subject.toLowerCase(),
          learning_type: learningType.toLowerCase(),
          num_topics: topics.length,
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,subject,learning_type",
        }
      );

    if (upsertError) {
      console.warn("Error upserting generation metadata:", upsertError);
      // Continue anyway - topics are saved
    }

    res.json({
      success: true,
      message: `Successfully saved ${insertedTopics.length} topics`,
      topics: insertedTopics.map((topic) => ({
        id: topic.topic_id,
        title: topic.title,
        description: topic.description,
        learningType: topic.learning_type,
        difficulty: topic.difficulty,
        createdAt: topic.created_at,
      })),
      learningType: learningType.toLowerCase(),
    });
  } catch (error) {
    console.error("Error saving topics:", error);
    res.status(500).json({
      error: "Failed to save topics",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/topics
 * Delete topics for a user and subject (for regeneration)
 */
router.delete("/", async (req, res) => {
  try {
    const userId = req.userId;
    const { subject } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!subject) {
      return res.status(400).json({ error: "Subject is required" });
    }

    // Delete topics
    const { error: deleteError } = await supabaseClient
      .from("user_topics")
      .delete()
      .eq("user_id", userId)
      .eq("subject", subject);

    if (deleteError) throw deleteError;

    // Delete generation metadata
    const { error: deleteGenError } = await supabaseClient
      .from("topic_generations")
      .delete()
      .eq("user_id", userId)
      .eq("subject", subject);

    if (deleteGenError) {
      console.warn("Error deleting generation metadata:", deleteGenError);
      // Continue anyway
    }

    res.json({
      success: true,
      message: "Topics deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting topics:", error);
    res.status(500).json({
      error: "Failed to delete topics",
      message: error.message,
    });
  }
});

export default router;

