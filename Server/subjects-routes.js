/**
 * Subjects API Routes for MINDMORPH
 * Handles subject selection, generation, and management
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as aiService from "./ai-content-service.js";

const router = express.Router();

// Initialize Supabase client (will be passed from server.js)
let supabaseClient = null;

export function initializeSubjectsRoutes(supabase) {
  supabaseClient = supabase;
}

/**
 * GET /api/subjects
 * Get all available subjects (both general and career)
 * Optionally filter by category
 */
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = supabaseClient
      .from("subjects")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (category) {
      query = query.eq("category", category.toLowerCase());
    }

    const { data: subjects, error } = await query;

    if (error) throw error;

    // Format response - names should already be normalized (lowercase with hyphens)
    // But we normalize here as a safety measure for any legacy data
    const formattedSubjects = subjects.map((subject) => ({
      id: subject.name.toLowerCase().replace(/\s+/g, '-'), // Normalized name as ID (e.g., "web-development")
      uuid: subject.id, // Keep UUID for database operations
      name: subject.name,
      category: subject.category,
      description: subject.description,
      icon: subject.icon,
      colors: subject.colors || ["#3B82F6", "#1E40AF"],
    }));

    res.json({
      success: true,
      subjects: formattedSubjects,
      count: formattedSubjects.length,
    });
  } catch (error) {
    console.error("Error getting subjects:", error);
    res.status(500).json({
      error: "Failed to get subjects",
      message: error.message,
    });
  }
});

/**
 * GET /api/subjects/user
 * Get subjects selected by the current user
 */
router.get("/user", async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { data: userSubjects, error } = await supabaseClient
      .from("user_subjects")
      .select(`
        *,
        subjects (*)
      `)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("selected_at", { ascending: false });

    if (error) throw error;

    // Format response - names should already be normalized (lowercase with hyphens)
    // But we normalize here as a safety measure for any legacy data
    const formattedSubjects = userSubjects.map((us) => ({
      id: us.subjects.name.toLowerCase().replace(/\s+/g, '-'), // Normalized name as ID (e.g., "web-development")
      uuid: us.subjects.id, // Keep UUID for database operations
      name: us.subjects.name,
      category: us.subjects.category,
      description: us.subjects.description,
      icon: us.subjects.icon,
      colors: us.subjects.colors || ["#3B82F6", "#1E40AF"],
      selectedAt: us.selected_at,
    }));

    res.json({
      success: true,
      subjects: formattedSubjects,
      count: formattedSubjects.length,
    });
  } catch (error) {
    console.error("Error getting user subjects:", error);
    res.status(500).json({
      error: "Failed to get user subjects",
      message: error.message,
    });
  }
});

/**
 * POST /api/subjects/user
 * Save selected subjects for the current user
 */
router.post("/user", async (req, res) => {
  try {
    const userId = req.userId;
    const { subjectIds, addMode = false } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        error: "subjectIds array is required and must not be empty",
      });
    }

    console.log(`Saving subjects for user ${userId}, addMode: ${addMode}, subjects: ${subjectIds.length}`);

    // Convert subject IDs (which are normalized names like "math", "web-development") to UUIDs
    // Frontend sends IDs like "math", "web-development" (lowercase with hyphens)
    // Database now stores names normalized with hyphens (e.g., "web-development")
    // But we also handle legacy data that might have spaces
    const normalizedIds = subjectIds.map(id => id.toLowerCase().trim());
    
    // Find subjects by name - try exact match first (with hyphens, which is the new format)
    const { data: existingSubjects, error: checkError } = await supabaseClient
      .from("subjects")
      .select("id, name")
      .in("name", normalizedIds)
      .eq("is_active", true);

    if (checkError) throw checkError;
    
    // If not all found, try alternative formats (with spaces for legacy data)
    if (existingSubjects && existingSubjects.length < subjectIds.length) {
      const foundIds = new Set(existingSubjects.map(s => s.id));
      const foundNames = new Set(existingSubjects.map(s => s.name.toLowerCase()));
      
      // Try alternative name formats for missing subjects (legacy format with spaces)
      const missingIds = subjectIds.filter(id => {
        const normalized = id.toLowerCase().trim();
        return !foundNames.has(normalized);
      });
      
      if (missingIds.length > 0) {
        // Try with spaces (legacy format)
        const alternativeIds = missingIds.flatMap(id => [
          id.toLowerCase().replace(/-/g, ' ').trim(), // "web-development" -> "web development"
          id.toLowerCase().trim(), // Already tried, but include for completeness
        ]);
        
        const { data: altSubjects, error: altError } = await supabaseClient
          .from("subjects")
          .select("id, name")
          .in("name", alternativeIds)
          .eq("is_active", true);
        
        if (!altError && altSubjects) {
          // Add subjects that weren't already found
          altSubjects.forEach(subject => {
            if (!foundIds.has(subject.id)) {
              existingSubjects.push(subject);
              foundIds.add(subject.id);
            }
          });
        }
      }
    }

    if (existingSubjects.length !== subjectIds.length) {
      return res.status(400).json({
        error: "One or more subject IDs are invalid",
      });
    }

    if (addMode) {
      // Add mode: Only add new subjects, don't deactivate existing ones
      console.log(`Add mode: Checking for existing user subjects to avoid duplicates...`);
      
      // Get current user's active subjects
      const { data: currentUserSubjects, error: currentError } = await supabaseClient
        .from("user_subjects")
        .select("subject_id")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (currentError) {
        console.warn("Error fetching current user subjects:", currentError);
      }

      // Filter out subjects that user already has
      const existingSubjectIds = new Set((currentUserSubjects || []).map(us => us.subject_id));
      const newSubjectsToAdd = existingSubjects.filter(subject => !existingSubjectIds.has(subject.id));

      if (newSubjectsToAdd.length === 0) {
        return res.status(400).json({
          error: "All selected subjects are already in your learning journey",
        });
      }

      console.log(`Adding ${newSubjectsToAdd.length} new subjects (${existingSubjects.length - newSubjectsToAdd.length} already exist)`);

      // Insert only new subjects
      const subjectsToInsert = newSubjectsToAdd.map((subject) => ({
        user_id: userId,
        subject_id: subject.id,
        is_active: true,
      }));

      const { data: insertedSubjects, error: insertError } = await supabaseClient
        .from("user_subjects")
        .insert(subjectsToInsert)
        .select(`
          *,
          subjects (*)
        `);

      if (insertError) {
        console.error("Error inserting new user subjects:", insertError);
        throw insertError;
      }

      console.log(`Successfully added ${insertedSubjects.length} new subject records`);

      // Format response with all user subjects (existing + newly added)
      const { data: allUserSubjects } = await supabaseClient
        .from("user_subjects")
        .select(`
          *,
          subjects (*)
        `)
        .eq("user_id", userId)
        .eq("is_active", true);

      const formattedSubjects = (allUserSubjects || []).map((us) => ({
        id: us.subjects.name.toLowerCase().replace(/\s+/g, '-'),
        uuid: us.subjects.id,
        name: us.subjects.name,
        category: us.subjects.category,
        description: us.subjects.description,
        icon: us.subjects.icon,
        colors: us.subjects.colors || ["#3B82F6", "#1E40AF"],
        selectedAt: us.selected_at || new Date().toISOString(),
      }));

      res.json({
        success: true,
        message: `Successfully added ${insertedSubjects.length} new subject${insertedSubjects.length !== 1 ? 's' : ''}`,
        subjects: formattedSubjects,
        count: formattedSubjects.length,
      });
      return;
    }

    // Replace mode: Deactivate all existing and insert new ones
    console.log(`Replace mode: Deactivating existing subjects for user ${userId}...`);
    const { error: deactivateError } = await supabaseClient
      .from("user_subjects")
      .update({ is_active: false })
      .eq("user_id", userId);

    if (deactivateError) {
      console.warn("Error deactivating existing subjects:", deactivateError);
    } else {
      console.log("Successfully deactivated existing subjects");
    }

    // Insert new selected subjects using UUIDs
    const subjectsToInsert = existingSubjects.map((subject) => ({
      user_id: userId,
      subject_id: subject.id, // Use UUID from database
      is_active: true,
    }));

    console.log(`Inserting ${subjectsToInsert.length} new subject selections for user ${userId}:`, 
      subjectsToInsert.map(s => ({ subject_id: s.subject_id })));

    const { data: insertedSubjects, error: insertError } = await supabaseClient
      .from("user_subjects")
      .upsert(subjectsToInsert, {
        onConflict: "user_id,subject_id",
        ignoreDuplicates: false,
      })
      .select(`
        *,
        subjects (*)
      `);

    if (insertError) {
      console.error("Error inserting user subjects:", insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedSubjects.length} user subject records`);

    // Format response - names should already be normalized (lowercase with hyphens)
    // But we normalize here as a safety measure for any legacy data
    const formattedSubjects = insertedSubjects.map((us) => ({
      id: us.subjects.name.toLowerCase().replace(/\s+/g, '-'), // Normalized name as ID (e.g., "web-development")
      uuid: us.subjects.id, // Keep UUID for database operations
      name: us.subjects.name,
      category: us.subjects.category,
      description: us.subjects.description,
      icon: us.subjects.icon,
      colors: us.subjects.colors || ["#3B82F6", "#1E40AF"],
      selectedAt: us.selected_at || new Date().toISOString(),
    }));

    console.log(`Successfully saved ${formattedSubjects.length} subjects for user ${userId}`);
    
    res.json({
      success: true,
      message: `Successfully saved ${formattedSubjects.length} subjects`,
      subjects: formattedSubjects,
      count: formattedSubjects.length,
    });
  } catch (error) {
    console.error("Error saving user subjects:", error);
    res.status(500).json({
      error: "Failed to save user subjects",
      message: error.message,
    });
  }
});

/**
 * POST /api/subjects/generate
 * Generate career subjects using AI based on user interests
 */
router.post("/generate", async (req, res) => {
  try {
    console.log("🚀 [BACKEND] POST /api/subjects/generate - Request received");
    const userId = req.userId;
    const { interests, category = "career" } = req.body;

    console.log("📝 [BACKEND] Request details:");
    console.log("   - User ID:", userId);
    console.log("   - Interests:", interests);
    console.log("   - Category:", category);

    if (!userId) {
      console.error("❌ [BACKEND] Authentication failed - no userId");
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if we already have enough career subjects in database
    console.log("🔍 [BACKEND] Checking existing career subjects in database...");
    const { data: existingCareerSubjects, error: checkError } = await supabaseClient
      .from("subjects")
      .select("id")
      .eq("category", "career")
      .eq("is_active", true);

    if (checkError) {
      console.error("❌ [BACKEND] Error checking existing subjects:", checkError);
      throw checkError;
    }

    console.log(`📊 [BACKEND] Found ${existingCareerSubjects?.length || 0} existing career subjects`);

    // IMPORTANT: Always generate new subjects based on user interests, don't just return existing ones
    // The user wants subjects tailored to their specific interests
    // If we have enough subjects (10+), we can still generate new ones based on interests
    // But for now, let's always generate to ensure user gets personalized results
    const shouldUseExisting = false; // Changed: Always generate new subjects based on interests
    
    if (shouldUseExisting && existingCareerSubjects && existingCareerSubjects.length >= 10) {
      console.log("✅ [BACKEND] Enough subjects exist (10+), returning existing ones");
      const { data: allCareerSubjects } = await supabaseClient
        .from("subjects")
        .select("*")
        .eq("category", "career")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(10);

      console.log(`📦 [BACKEND] Returning ${allCareerSubjects?.length || 0} existing subjects`);

      const formatted = allCareerSubjects.map((s) => ({
        id: s.name, // Name is already normalized in database (e.g., "web-development")
        uuid: s.id, // Keep UUID for database operations
        name: s.name,
        category: s.category,
        description: s.description,
        icon: s.icon,
        colors: s.colors || ["#3B82F6", "#1E40AF"],
      }));

      console.log("✅ [BACKEND] Sending response with existing subjects");
      return res.json({
        success: true,
        subjects: formatted,
        generated: false,
        message: "Using existing subjects from database",
      });
    }

    // Generate new subjects using AI
    console.log("🤖 [BACKEND] Not enough subjects, generating new ones with AI...");
    console.log("   - Calling aiService.generateSubjects with:");
    console.log("     - Interests:", interests || "technology and programming");
    console.log("     - Category:", category);
    console.log("     - Num subjects: 10 (fixed to ensure we get at least 10)");
    
    try {
      // Always request exactly 10 subjects to minimize AI calls
      const generatedSubjects = await aiService.generateSubjects(
        interests || "technology and programming",
        category,
        10 // Fixed to 10 to ensure consistent generation and reduce AI calls
      );

      console.log(`✅ [BACKEND] AI generated ${generatedSubjects?.length || 0} subjects`);
      console.log("   - Subject names:", generatedSubjects?.map(s => s.name).join(", ") || "none");

      // Save generated subjects to database
      const subjectsToInsert = generatedSubjects.map((subject) => ({
        name: subject.name,
        category: category,
        description: subject.description,
        icon: subject.icon || "book-open-variant",
        colors: subject.colors || ["#3B82F6", "#1E40AF"],
        is_active: true,
      }));

      console.log("💾 [BACKEND] Saving generated subjects to database...");
      console.log("   - Subjects to insert:", subjectsToInsert.length);
      console.log("   - Subject names:", subjectsToInsert.map(s => s.name).join(", "));

      // Use upsert to avoid duplicates
      const { data: insertedSubjects, error: insertError } = await supabaseClient
        .from("subjects")
        .upsert(subjectsToInsert, {
          onConflict: "name",
          ignoreDuplicates: false,
        })
        .select();

      if (insertError) {
        console.error("❌ [BACKEND] Error inserting generated subjects:", insertError);
        console.error("   - Error code:", insertError.code);
        console.error("   - Error message:", insertError.message);
        console.error("   - Error details:", insertError.details);
        // Return generated subjects even if insert fails (format them)
        // Names are already normalized by AI service
        const formattedGenerated = generatedSubjects.map((s) => ({
          id: s.name, // Already normalized (e.g., "web-development")
          uuid: null,
          name: s.name,
          category: category,
          description: s.description,
          icon: s.icon,
          colors: s.colors,
        }));
        return res.json({
          success: true,
          subjects: formattedGenerated,
          generated: true,
          message: "Subjects generated but not saved to database",
        });
      }

      console.log(`✅ [BACKEND] Successfully saved ${insertedSubjects?.length || 0} subjects to database`);

      // Format response - name is already normalized (lowercase with hyphens)
      const formatted = insertedSubjects.map((s) => ({
        id: s.name, // Name is already normalized (e.g., "web-development")
        uuid: s.id, // Keep UUID for database operations
        name: s.name, // Display name (same as ID for now)
        category: s.category,
        description: s.description,
        icon: s.icon,
        colors: s.colors || ["#3B82F6", "#1E40AF"],
      }));

      console.log("✅ [BACKEND] Sending success response with generated subjects");
      res.json({
        success: true,
        subjects: formatted,
        generated: true,
        message: `Generated and saved ${formatted.length} new subjects`,
      });
    } catch (aiError) {
      console.error("❌ [BACKEND] AI generation failed:");
      console.error("   - Error type:", aiError?.constructor?.name || typeof aiError);
      console.error("   - Error message:", aiError?.message);
      console.error("   - Error stack:", aiError?.stack);
      
      // Don't return fallback subjects - return error instead
      console.error("❌ [BACKEND] Returning error response - no subjects will be returned");
      res.status(500).json({
        success: false,
        error: "Failed to generate subjects using AI",
        message: aiError?.message || "AI service is unavailable or returned an error. Please check your AI API configuration and try again.",
        subjects: [],
        generated: false,
      });
      return;
    }
  } catch (error) {
    console.error("❌ [BACKEND] Fatal error in /api/subjects/generate:");
    console.error("   - Error type:", error?.constructor?.name || typeof error);
    console.error("   - Error message:", error?.message);
    console.error("   - Error stack:", error?.stack);
    res.status(500).json({
      error: "Failed to generate subjects",
      message: error.message,
    });
  }
});

export default router;

