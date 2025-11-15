import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path"; 
import fs from "fs";
import mlRoutes from "./ml-routes.js";
import * as mlServices from "./ml-services.js";
import aiRoutes from "./ai-routes.js";
import * as aiServices from "./ai-content-service.js";
dotenv.config();
import genAI from './geminiClient.js';


const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({dest: "uploads/"});

// Serve static files from uploads directory (for audio files, images, videos, etc.)
// Enable CORS for video files and set proper headers
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    // Set CORS headers for video files
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Range');
    
    // Set proper content type for video files
    if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
      res.set('Accept-Ranges', 'bytes');
    } else if (path.endsWith('.mp3')) {
      res.set('Content-Type', 'audio/mpeg');
    }
  }
}));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize ML Services
mlServices.initializeMLServices(supabase);

// Initialize AI Services
// Supports: 'openai', 'anthropic', 'google', 'ollama'
// Default to 'google' (Gemini) - FREE TIER AVAILABLE
// Ollama runs locally - NO API KEY NEEDED!
const aiProvider = process.env.AI_PROVIDER || 'google';
const aiApiKey = process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

// Debug: Log what we found
console.log('🔍 AI Configuration Check:');
console.log(`   Provider: ${aiProvider}`);
console.log(`   API Key found: ${aiApiKey ? 'Yes (' + aiApiKey.substring(0, 10) + '...)' : 'No'}`);
console.log(`   GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? 'Set' : 'Not set'}`);
// Ollama doesn't need an API key (runs locally)
if (aiProvider === 'ollama') {
  aiServices.initializeAIServices(supabase, null, aiProvider);
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'phi3'; // phi3 is smaller, needs less RAM
  console.log(`✅ AI Services initialized with provider: ${aiProvider} (Local)`);
  console.log(`   Ollama URL: ${ollamaUrl}`);
  console.log(`   Model: ${ollamaModel}`);
  console.log('   No API key needed - runs locally!');
} else {
  // Debug: Check which API key is being used
  if (process.env.GOOGLE_AI_API_KEY) {
    console.log('📝 Found GOOGLE_AI_API_KEY in .env');
  } else if (process.env.OPENAI_API_KEY) {
    console.log('📝 Found OPENAI_API_KEY in .env');
  } else if (process.env.ANTHROPIC_API_KEY) {
    console.log('📝 Found ANTHROPIC_API_KEY in .env');
  } else {
    console.warn('⚠️  No AI API keys found in .env file');
  }

  if (aiApiKey) {
    // Show first few characters of key for verification (security: don't show full key)
    const keyPreview = aiApiKey.substring(0, 10) + '...';
    aiServices.initializeAIServices(supabase, aiApiKey, aiProvider);
    console.log(`✅ AI Services initialized with provider: ${aiProvider}`);
    console.log(`   API Key: ${keyPreview}`);
    if (aiProvider === 'google') {
      console.log('   Using Google Gemini 2.5/2.0 (Free tier available)');
      console.log('   Models: gemini-2.0-flash-exp (latest), gemini-1.5-flash (stable)');
    }
  } else {
    console.warn('⚠️  AI API key not found. AI content generation will not work.');
    console.warn('   Set GOOGLE_AI_API_KEY (FREE), OPENAI_API_KEY, or ANTHROPIC_API_KEY in .env');
    console.warn('   OR use Ollama (local, free): Set AI_PROVIDER=ollama in .env');
    console.warn('   Get free Google API key: https://makersuite.google.com/app/apikey');
    console.warn('   Get Ollama: https://ollama.ai');
    console.warn('   Make sure .env file is in the Server folder and server is restarted after adding key');
  }
}

// MIDDLEWARE
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 

    if(!decoded.id){
      return res.status(403).json({ error: "Token missing user ID" });
    }
    // req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(403).json({ error: "Invalid or expired token." });
  }
}

// REGISTER ROUTE
app.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      avatarUrl,
      preferredLanguage,
      learningStyle,
      date_of_birth,
    } = req.body;

    if (!email || !password || !fullName) {
      return res
        .status(400)
        .json({ error: "Full name, email, and password are required" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { fullName, date_of_birth },
        email_confirm: false,
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { data: tableData, error: tableError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          email: authData.user.email,
          password_hash,
          full_name: fullName,
          avatar_url: avatarUrl || null,
          preferred_language: preferredLanguage || "en",
          learning_style: learningStyle || "mixed",
          created_at: new Date(),
          updated_at: new Date(),
          status: "pending",
        },
      ])
      .select()
      .single();

    if (tableError) {
      return res.status(400).json({ error: tableError.message });
    }

    res.status(201).json({
      id: tableData.id,
      email: tableData.email,
      full_name: tableData.full_name,
      avatar_url: tableData.avatar_url,
      preferred_language: tableData.preferred_language,
      learning_style: tableData.learning_style,
      message:
        "Account created! Please check your email to confirm your account.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password is required" });
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw authError;

    const user = authData.users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.email_confirmed_at) {
      return res
        .status(403)
        .json({ error: "Please confirm your email before logging in" });
    }

    const { data: tableData, error: tableError } = await supabase
      .from("users")
      .select(
        "password_hash, full_name, avatar_url, preferred_language, learning_style, status"
      )
      .eq("email", email)
      .single();

    if (tableError || !tableData) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const PassMatch = await bcrypt.compare(password, tableData.password_hash);

    if (!PassMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      token,
      email,
      fullName: tableData.full_name,
      avatarUrl: tableData.avatar_url,
      preferredLanguage: tableData.preferred_language,
      learningStyle: tableData.learning_style,
      message: "Login successful",
    });

    console.log(token);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId; // directly from middleware
    console.log("Fetching profile for userId:", userId);

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error("Supabase returned error:", error);
      return res.status(404).json({ error: "User not found" });
    }

    delete user.password; // remove sensitive info
    res.json({ message: "User profile fetched successfully", user });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put(
  "/edit",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    const { full_name } = req.body;
    const userId = req.userId;
    let avatar_url;

    try {
      // Handle avatar upload
      if (req.file) {
        const filepath = req.file.path;
        const fileExt = path.extname(req.file.originalname);
        const filename = `${userId}-${Date.now()}${fileExt}`;

        // Upload to Supabase
        const { data, error } = await supabase.storage
          .from("profiles")
          .upload(filename, fs.createReadStream(filepath), {
            cacheControl: "3600",
            upsert: true,
            contentType: req.file.mimetype,
          });

        fs.unlinkSync(filepath);

        if (error) throw error;

        const { data: publicData } = supabase.storage
          .from("profiles")
          .getPublicUrl(filename);

        avatar_url = publicData?.publicUrl;
      }

      // Prepare update object
      const updateObj = { updated_at: new Date().toISOString() };
      if (full_name) updateObj.full_name = full_name;
      if (avatar_url) updateObj.avatar_url = avatar_url;

      // Update user in Supabase
      const { data: userData, error: userError } = await supabase
        .from("users")
        .update(updateObj)
        .eq("id", userId)
        .select()
        .single();

      if (userError) throw userError;

      res.json({ success: true, user: userData });
    } catch (err) {
      console.error("Profile edit error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to update profile" });
    }
  }
);



app.post("/activity", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      subject,
      reading_time,
      playback_time,
      quiz_score,
      focus_level,
      activity_type,
      device_used,
      session_date,
    } = req.body;

    // Log received data for validation
    console.log("📥 Received activity log data:");
    console.log(`   User ID: ${userId}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Activity Type: ${activity_type}`);
    console.log(`   Reading Time: ${reading_time || 0}s`);
    console.log(`   Playback Time: ${playback_time || 0}`);
    console.log(`   Quiz Score: ${quiz_score || 'N/A'}%`);

    if (!subject || !activity_type) {
      console.error("❌ Validation failed: Missing subject or activity_type");
      return res.status(400).json({
        error: "Subject and activity_type are required.",
      });
    }

    // Check if record already exists for this user, subject, and activity_type
    const { data: existingRecord, error: selectError } = await supabase
      .from("activity_logs")
      .select("id, reading_time, playback_time, quiz_score, focus_level")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("activity_type", activity_type)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("❌ Error checking existing record:", selectError);
      return res.status(500).json({ 
        error: "Failed to check existing activity",
        details: selectError.message 
      });
    }

    let result;
    let isUpdate = false;

    if (existingRecord) {
      // Update existing record - accumulate engagement metrics
      console.log(`   Existing record found (ID: ${existingRecord.id}), updating...`);
      isUpdate = true;
      
      // Accumulate reading_time and playback_time (add new values to existing)
      const updatedReadingTime = (existingRecord.reading_time || 0) + (reading_time || 0);
      const updatedPlaybackTime = (existingRecord.playback_time || 0) + (playback_time || 0);
      
      // Update quiz_score and focus_level if provided (use latest values)
      const updateData = {
        reading_time: updatedReadingTime,
        playback_time: updatedPlaybackTime,
        session_date: session_date || new Date().toISOString(),
      };
      
      // Only update quiz_score and focus_level if new values are provided
      if (quiz_score !== null && quiz_score !== undefined) {
        updateData.quiz_score = quiz_score;
      }
      if (focus_level !== null && focus_level !== undefined) {
        updateData.focus_level = focus_level;
      }
      if (device_used) {
        updateData.device_used = device_used;
      }
      
      console.log(`   Update data:`, JSON.stringify(updateData, null, 2));
      console.log(`   Previous reading_time: ${existingRecord.reading_time || 0}s, adding: ${reading_time || 0}s, new total: ${updatedReadingTime}s`);
      console.log(`   Previous playback_time: ${existingRecord.playback_time || 0}, adding: ${playback_time || 0}, new total: ${updatedPlaybackTime}`);
      
      const { data: updatedData, error: updateError } = await supabase
        .from("activity_logs")
        .update(updateData)
        .eq("id", existingRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Error updating activity:", updateError);
        console.error(`   Error Code: ${updateError.code}`);
        console.error(`   Error Message: ${updateError.message}`);
        return res.status(500).json({ 
          error: "Failed to update activity",
          details: updateError.message 
        });
      }

      result = updatedData;
    } else {
      // Insert new record
      console.log(`   No existing record found, creating new...`);
      const activityData = {
        user_id: userId,
        subject,
        activity_type,
        quiz_score: quiz_score || null,
        focus_level: focus_level || null,
        reading_time: reading_time || 0,
        playback_time: playback_time || 0,
        device_used: device_used || null,
        session_date: session_date || new Date().toISOString(),
      };
      
      console.log("💾 Attempting to insert new record:");
      console.log(`   Data:`, JSON.stringify(activityData, null, 2));

      const { data: insertedData, error: insertError } = await supabase
        .from("activity_logs")
        .insert([activityData])
        .select()
        .single();

      if (insertError) {
        console.error("❌ Error inserting activity:", insertError);
        console.error(`   Error Code: ${insertError.code}`);
        console.error(`   Error Message: ${insertError.message}`);
        console.error(`   Error Details:`, insertError);
        return res.status(500).json({ 
          error: "Failed to save activity",
          details: insertError.message 
        });
      }

      result = insertedData;
    }

    // Validate saved data
    console.log(`✅ Activity ${isUpdate ? 'updated' : 'logged'} successfully!`);
    console.log(`   Activity ID: ${result.id}`);
    console.log(`   Saved Reading Time: ${result.reading_time || 'N/A'}s`);
    console.log(`   Saved Playback Time: ${result.playback_time || 'N/A'}`);
    console.log(`   Saved Quiz Score: ${result.quiz_score || 'N/A'}%`);
    console.log(`   Saved Focus Level: ${result.focus_level || 'N/A'}%`);
    console.log(`   Full saved record:`, JSON.stringify(result, null, 2));

    res.status(isUpdate ? 200 : 201).json({
      message: isUpdate 
        ? "Study activity updated successfully." 
        : "Study activity recorded successfully.",
      activity: result,
      isUpdate: isUpdate,
    });
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/visual-learning", authenticateToken, async(req,res) => {
  const userId = req.userId;
  const { quiz_score } = req.body;
  const learning = "Audio Visual"

  try {
    const { data, error } = await supabase.from("quiz").insert([
      {
        user_id: userId,
        Learning_Type: learning,
        score: quiz_score ?? null,
      }
    ]).select().single();

    if(error){
      console.log("Server error", error);      
      return res.status(500).json({error: "internal error"})
    }

    res.status(201).json({
      message: "Study activity recorded successfully.",
      activity: data,
    });
  } catch (error) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
})

/**
 * POST /quiz-progress
 * Save detailed quiz progress including individual question responses
 */
app.post("/quiz-progress", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      subject,
      topic,
      learning_type,
      difficulty,
      total_questions,
      correct_answers,
      score,
      time_taken,
      reading_time_seconds, // Reading time in seconds (for text learning)
      audio_play_count, // Audio play count (for audio learning)
      responses, // Array of question responses
    } = req.body;

    // Log received data for validation
    console.log("📥 Received quiz progress data:");
    console.log(`   User ID: ${userId}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Learning Type: ${learning_type}`);
    console.log(`   Reading Time (seconds): ${reading_time_seconds || 0}`);
    console.log(`   Audio Play Count: ${audio_play_count || 0}`);
    console.log(`   Score: ${score || 'N/A'}%`);
    console.log(`   Total Questions: ${total_questions}`);

    // Validation
    if (!subject || !total_questions || !responses || !Array.isArray(responses)) {
      console.error("❌ Validation failed: Missing required fields");
      return res.status(400).json({
        error: "Missing required fields: subject, total_questions, and responses array are required.",
      });
    }

    // Calculate score if not provided
    const calculatedScore = score !== undefined 
      ? parseFloat(score) 
      : (correct_answers / total_questions) * 100;

    // Map reading_time_seconds and audio_play_count to reading_time and playback_time
    // reading_time is in seconds, playback_time is the count of audio plays
    const readingTime = reading_time_seconds || 0;
    const playbackTime = audio_play_count || 0;
    
    console.log("📊 Mapped engagement metrics:");
    console.log(`   Reading Time: ${readingTime}s`);
    console.log(`   Playback Time (count): ${playbackTime}`);

    // Check if record already exists for this user, subject, and learning_type
    // (This should exist from when user clicked "I'm Ready for Quiz")
    const { data: existingRecord, error: selectError } = await supabase
      .from("activity_logs")
      .select("id, reading_time, playback_time, quiz_score, focus_level")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("activity_type", learning_type || "mixed")
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("❌ Error checking existing record:", selectError);
      return res.status(500).json({
        error: "Failed to check existing activity",
        details: selectError.message,
      });
    }

    let activityData;
    let isUpdate = false;

    if (existingRecord) {
      // Update existing record with quiz results
      console.log(`   Existing record found (ID: ${existingRecord.id}), updating with quiz results...`);
      isUpdate = true;
      
      // Keep existing reading_time and playback_time (already saved before quiz)
      // Only update quiz_score and focus_level with quiz results
      const updateData = {
        quiz_score: Math.round(calculatedScore),
        focus_level: calculatedScore >= 80 ? 85 : calculatedScore >= 60 ? 70 : 50,
        session_date: new Date().toISOString(),
        // Keep existing reading_time and playback_time
        reading_time: existingRecord.reading_time || readingTime,
        playback_time: existingRecord.playback_time || playbackTime,
      };
      
      console.log(`   Update data:`, JSON.stringify(updateData, null, 2));
      console.log(`   Previous reading_time: ${existingRecord.reading_time || 0}s (preserved)`);
      console.log(`   Previous playback_time: ${existingRecord.playback_time || 0} (preserved)`);
      console.log(`   Updating quiz_score: ${updateData.quiz_score}%, focus_level: ${updateData.focus_level}%`);
      
      const { data: updatedData, error: updateError } = await supabase
        .from("activity_logs")
        .update(updateData)
        .eq("id", existingRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Error updating quiz activity:", updateError);
        console.error(`   Error Code: ${updateError.code}`);
        console.error(`   Error Message: ${updateError.message}`);
        console.error(`   Error Details:`, updateError);
        return res.status(500).json({
          error: "Failed to update quiz activity",
          details: updateError.message,
        });
      }

      activityData = updatedData;
    } else {
      // Insert new record (fallback if record wasn't created before quiz)
      console.log(`   No existing record found, creating new with quiz results...`);
      const insertData = {
        user_id: userId,
        subject,
        activity_type: learning_type || "mixed",
        quiz_score: Math.round(calculatedScore),
        focus_level: calculatedScore >= 80 ? 85 : calculatedScore >= 60 ? 70 : 50,
        reading_time: readingTime,
        playback_time: playbackTime,
        session_date: new Date().toISOString(),
      };
      
      console.log("💾 Attempting to insert new record:");
      console.log(`   Data:`, JSON.stringify(insertData, null, 2));

      const { data: insertedData, error: insertError } = await supabase
        .from("activity_logs")
        .insert([insertData])
        .select()
        .single();

      if (insertError) {
        console.error("❌ Error inserting quiz activity:", insertError);
        console.error(`   Error Code: ${insertError.code}`);
        console.error(`   Error Message: ${insertError.message}`);
        console.error(`   Error Details:`, insertError);
        return res.status(500).json({
          error: "Failed to save quiz activity",
          details: insertError.message,
        });
      }

      activityData = insertedData;
    }

    // Validate saved data
    console.log(`✅ Quiz progress ${isUpdate ? 'updated' : 'saved'} to activity_logs successfully!`);
    console.log(`   Activity ID: ${activityData.id}`);
    console.log(`   Subject: ${subject}, Score: ${calculatedScore}%, Questions: ${total_questions}/${correct_answers} correct`);
    console.log(`   Saved Reading Time: ${activityData.reading_time || 'N/A'}s`);
    console.log(`   Saved Playback Time: ${activityData.playback_time || 'N/A'}`);
    console.log(`   Saved Quiz Score: ${activityData.quiz_score || 'N/A'}%`);
    console.log(`   Saved Focus Level: ${activityData.focus_level || 'N/A'}%`);
    console.log(`   Full saved record:`, JSON.stringify(activityData, null, 2));

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate 
        ? "Quiz progress updated successfully" 
        : "Quiz progress saved successfully",
      activity: activityData,
      isUpdate: isUpdate,
      quiz_summary: {
        total_questions,
        correct_answers: correct_answers || 0,
        score: calculatedScore,
        responses_count: responses.length,
      },
    });
  } catch (err) {
    console.error("Server error in quiz-progress:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

/**
 * POST /adaptive-content
 * Save or update engagement data (audio play count, reading time, etc.) to adaptivecontent table
 * Uses upsert to update existing records or create new ones
 */
app.post("/adaptive-content", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      subject,
      topic,
      learning_type,
      audio_play_count,
      video_play_count,
      reading_time_seconds,
      quiz_score,
    } = req.body;

    // Log received data for validation
    console.log("📥 Received adaptive content data:");
    console.log(`   User ID: ${userId}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Topic: ${topic || 'N/A'}`);
    console.log(`   Learning Type: ${learning_type}`);
    console.log(`   Reading Time (seconds): ${reading_time_seconds || 0}`);
    console.log(`   Audio Play Count: ${audio_play_count || 0}`);
    console.log(`   Quiz Score: ${quiz_score || 'N/A'}%`);

    // Validation
    if (!subject || !learning_type) {
      console.error("❌ Validation failed: Missing subject or learning_type");
      return res.status(400).json({
        error: "Missing required fields: subject and learning_type are required.",
      });
    }

    // Calculate confidence based on engagement and performance
    // Higher engagement + better score = higher confidence
    let engagementScore = 0;
    if (learning_type === "audio") {
      // Each audio play = 20 points, max 100
      engagementScore = Math.min(100, (audio_play_count || 0) * 20);
    } else if (learning_type === "visual") {
      // Each video play = 20 points, max 100 (for future use)
      engagementScore = Math.min(100, (video_play_count || 0) * 20);
    } else if (learning_type === "text") {
      // 10 seconds of reading = 1 point, max 100
      engagementScore = Math.min(100, (reading_time_seconds || 0) / 10);
    }

    // Combine engagement and quiz performance for confidence (0.0 to 1.0)
    const quizScoreWeight = quiz_score !== undefined ? quiz_score : 0;
    const confidence = (engagementScore * 0.4 + quizScoreWeight * 0.6) / 100;

    // Prepare data for upsert
    const adaptiveData = {
      user_id: userId,
      subject,
      topic: topic || null,
      "contentType": learning_type, // Keep contentType for backward compatibility
      learning_type: learning_type,
      confidence: Math.max(0, Math.min(1, confidence)), // Clamp between 0 and 1
      audio_play_count: audio_play_count || 0,
      video_play_count: video_play_count || 0,
      reading_time_seconds: reading_time_seconds || 0,
      updated_at: new Date().toISOString(),
    };
                                                       
    console.log("📊 Calculated engagement metrics:");
    console.log(`   Engagement Score: ${engagementScore}/100`);
    console.log(`   Confidence: ${confidence.toFixed(2)}`);
    console.log("💾 Attempting to save/update adaptivecontent:");
    console.log(`   Data:`, JSON.stringify(adaptiveData, null, 2));

    // Check if record already exists
    const { data: existingData, error: selectError } = await supabase
      .from("adaptivecontent")
      .select("id")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("topic", topic || null)
      .eq("learning_type", learning_type)
      .maybeSingle();

    let result;
    let isUpdate = false;
    
    if (existingData && !selectError) {
      // Update existing record
      console.log(`   Existing record found (ID: ${existingData.id}), updating...`);
      isUpdate = true;
      const updateData = {
        confidence: Math.max(0, Math.min(1, confidence)),
        audio_play_count: audio_play_count || 0,
        video_play_count: video_play_count || 0,
        reading_time_seconds: reading_time_seconds || 0,
        updated_at: new Date().toISOString(),
      };
      
      console.log(`   Update data:`, JSON.stringify(updateData, null, 2));
      
      const { data: updatedData, error: updateError } = await supabase
        .from("adaptivecontent")
        .update(updateData)
        .eq("id", existingData.id)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Error updating adaptive content:", updateError);
        throw updateError;
      }

      // Validate saved data
      console.log("✅ Engagement data updated successfully!");
      console.log(`   Record ID: ${updatedData.id}`);
      console.log(`   Saved Reading Time: ${updatedData.reading_time_seconds || 'N/A'}s (expected: ${reading_time_seconds || 0}s)`);
      console.log(`   Saved Audio Play Count: ${updatedData.audio_play_count || 'N/A'} (expected: ${audio_play_count || 0})`);
      console.log(`   Saved Confidence: ${updatedData.confidence || 'N/A'}`);
      
      // Validation check
      if (updatedData.reading_time_seconds !== (reading_time_seconds || 0)) {
        console.warn(`⚠️ Reading time mismatch! Expected: ${reading_time_seconds || 0}s, Got: ${updatedData.reading_time_seconds}s`);
      }
      if (updatedData.audio_play_count !== (audio_play_count || 0)) {
        console.warn(`⚠️ Audio play count mismatch! Expected: ${audio_play_count || 0}, Got: ${updatedData.audio_play_count}`);
      }
      
      console.log(`   Full saved record:`, JSON.stringify(updatedData, null, 2));

      result = {
        success: true,
        message: "Engagement data updated successfully",
        data: updatedData,
      };
    } else {
      // Create new record
      console.log(`   No existing record found, creating new...`);
      const { data: newData, error: insertError } = await supabase
        .from("adaptivecontent")
        .insert([adaptiveData])
        .select()
        .single();

      if (insertError) {
        console.error("❌ Error saving engagement data:", insertError);
        console.error(`   Error Code: ${insertError.code}`);
        console.error(`   Error Message: ${insertError.message}`);
        console.error(`   Error Details:`, insertError);
        throw insertError;
      }

      // Validate saved data
      console.log("✅ Engagement data saved successfully!");
      console.log(`   Record ID: ${newData.id}`);
      console.log(`   Saved Reading Time: ${newData.reading_time_seconds || 'N/A'}s (expected: ${reading_time_seconds || 0}s)`);
      console.log(`   Saved Audio Play Count: ${newData.audio_play_count || 'N/A'} (expected: ${audio_play_count || 0})`);
      console.log(`   Saved Confidence: ${newData.confidence || 'N/A'}`);
      
      // Validation check
      if (newData.reading_time_seconds !== (reading_time_seconds || 0)) {
        console.warn(`⚠️ Reading time mismatch! Expected: ${reading_time_seconds || 0}s, Got: ${newData.reading_time_seconds}s`);
      }
      if (newData.audio_play_count !== (audio_play_count || 0)) {
        console.warn(`⚠️ Audio play count mismatch! Expected: ${audio_play_count || 0}, Got: ${newData.audio_play_count}`);
      }
      
      console.log(`   Full saved record:`, JSON.stringify(newData, null, 2));

      result = {
        success: true,
        message: "Engagement data saved successfully",
        data: newData,
      };
    }

    res.status(isUpdate ? 200 : 201).json(result);
  } catch (err) {
    console.error("Server error in adaptive-content:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

// ML/AI Routes - All routes require authentication
app.use("/api/ml", authenticateToken, mlRoutes);
app.use("/api/ai", authenticateToken, aiRoutes);

// START SERVER
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
