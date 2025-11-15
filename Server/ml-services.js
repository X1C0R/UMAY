/**
 * ML/AI Services for MINDMORPH Learning Platform
 * Provides machine learning capabilities for adaptive learning
 */

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client (will be passed from server.js)
let supabaseClient = null;

export function initializeMLServices(supabase) {
  supabaseClient = supabase;
}

/**
 * 1. LEARNING MODE RECOMMENDATION
 * Predicts optimal learning mode (Visual/Audio/Text) based on user history
 */
export async function recommendLearningMode(userId, subject) {
  try {
    // Fetch user's activity history with subject filter if provided
    let query = supabaseClient
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("session_date", { ascending: false })
      .limit(100); // Increased limit for better analysis
    
    if (subject) {
      query = query.eq("subject", subject);
    }

    const { data: activities, error } = await query;

    if (error) throw error;

    if (!activities || activities.length === 0) {
      // Default recommendation for new users
      return {
        recommendedMode: "visual",
        confidence: 0.3,
        reasoning: "No learning history found. We recommend starting with Visual Learning as it's effective for most learners.",
        modeStats: {
          visual: { totalScore: 0, totalSessions: 0, avgFocus: 0, engagementScore: 0 },
          audio: { totalScore: 0, totalSessions: 0, avgFocus: 0, engagementScore: 0 },
          text: { totalScore: 0, totalSessions: 0, avgFocus: 0, engagementScore: 0 },
        },
      };
    }

    // Calculate comprehensive performance metrics per mode
    const modePerformance = {
      visual: { totalScore: 0, totalSessions: 0, avgFocus: 0, engagementScore: 0, totalReadingTime: 0, totalPlaybackTime: 0 },
      audio: { totalScore: 0, totalSessions: 0, avgFocus: 0, engagementScore: 0, totalReadingTime: 0, totalPlaybackTime: 0 },
      text: { totalScore: 0, totalSessions: 0, avgFocus: 0, engagementScore: 0, totalReadingTime: 0, totalPlaybackTime: 0 },
    };

    activities.forEach((activity) => {
      const mode = activity.activity_type?.toLowerCase() || "visual";
      if (modePerformance[mode]) {
        const quizScore = parseFloat(activity.quiz_score) || 0;
        const focusLevel = parseInt(activity.focus_level) || 0;
        const readingTime = parseInt(activity.reading_time) || 0;
        const playbackTime = parseInt(activity.playback_time) || 0;
        
        modePerformance[mode].totalScore += quizScore;
        modePerformance[mode].totalSessions += 1;
        modePerformance[mode].avgFocus += focusLevel;
        modePerformance[mode].totalReadingTime += readingTime;
        modePerformance[mode].totalPlaybackTime += playbackTime;
        
        // Calculate engagement score: reading time (for text) or playback count (for audio) or focus (for visual)
        let engagement = 0;
        if (mode === "text" && readingTime > 0) {
          engagement = Math.min(100, readingTime / 10); // 10 seconds = 1 point, max 100
        } else if (mode === "audio" && playbackTime > 0) {
          engagement = Math.min(100, playbackTime * 20); // Each play = 20 points, max 100
        } else if (mode === "visual" && focusLevel > 0) {
          engagement = focusLevel; // Focus level is already 0-100
        }
        modePerformance[mode].engagementScore += engagement;
      }
    });

    // Calculate weighted scores with engagement metrics
    let bestMode = "visual";
    let bestScore = 0;
    const modeScores = {};

    Object.keys(modePerformance).forEach((mode) => {
      const perf = modePerformance[mode];
      if (perf.totalSessions > 0) {
        const avgScore = perf.totalScore / perf.totalSessions;
        const avgFocus = perf.avgFocus / perf.totalSessions;
        const avgEngagement = perf.engagementScore / perf.totalSessions;
        
        // Enhanced weighted score:
        // 40% quiz performance, 30% focus level, 30% engagement
        const weightedScore = (avgScore * 0.4) + (avgFocus * 0.3) + (avgEngagement * 0.3);
        modeScores[mode] = weightedScore;
        
        if (weightedScore > bestScore) {
          bestScore = weightedScore;
          bestMode = mode;
        }
      } else {
        modeScores[mode] = 0;
      }
    });

    // Calculate confidence based on data quality and consistency
    const totalSessions = activities.length;
    const recommendedSessions = modePerformance[bestMode].totalSessions;
    const dataQuality = Math.min(0.3 + (totalSessions * 0.01), 0.4); // Base confidence from total sessions
    const modeConfidence = Math.min(0.3 + (recommendedSessions * 0.02), 0.4); // Confidence from mode-specific sessions
    const scoreConfidence = bestScore > 0 ? Math.min(0.2, bestScore / 500) : 0.1; // Confidence from score quality
    
    const confidence = Math.min(dataQuality + modeConfidence + scoreConfidence, 0.95);

    // Generate detailed reasoning
    const recommendedStats = modePerformance[bestMode];
    const avgScore = recommendedStats.totalSessions > 0 
      ? Math.round(recommendedStats.totalScore / recommendedStats.totalSessions) 
      : 0;
    const avgFocus = recommendedStats.totalSessions > 0 
      ? Math.round(recommendedStats.avgFocus / recommendedStats.totalSessions) 
      : 0;
    
    let reasoning = `Based on ${totalSessions} learning session${totalSessions !== 1 ? 's' : ''}`;
    if (subject) {
      reasoning += ` in ${subject}`;
    }
    reasoning += `, ${bestMode} learning shows the best results`;
    
    if (recommendedStats.totalSessions > 0) {
      reasoning += ` with an average score of ${avgScore}%`;
      if (avgFocus > 0) {
        reasoning += ` and focus level of ${avgFocus}%`;
      }
    }
    reasoning += `.`;

    // Add engagement insights
    if (bestMode === "text" && recommendedStats.totalReadingTime > 0) {
      const avgReadingTime = Math.round(recommendedStats.totalReadingTime / recommendedStats.totalSessions);
      reasoning += ` You spent an average of ${avgReadingTime} seconds reading, showing strong engagement.`;
    } else if (bestMode === "audio" && recommendedStats.totalPlaybackTime > 0) {
      reasoning += ` You played audio content ${recommendedStats.totalPlaybackTime} time${recommendedStats.totalPlaybackTime !== 1 ? 's' : ''}, indicating good audio learning engagement.`;
    }

    return {
      recommendedMode: bestMode,
      confidence: confidence,
      reasoning: reasoning,
      modeStats: {
        visual: {
          totalScore: modePerformance.visual.totalScore,
          totalSessions: modePerformance.visual.totalSessions,
          avgFocus: modePerformance.visual.totalSessions > 0 
            ? Math.round(modePerformance.visual.avgFocus / modePerformance.visual.totalSessions) 
            : 0,
        },
        audio: {
          totalScore: modePerformance.audio.totalScore,
          totalSessions: modePerformance.audio.totalSessions,
          avgFocus: modePerformance.audio.totalSessions > 0 
            ? Math.round(modePerformance.audio.avgFocus / modePerformance.audio.totalSessions) 
            : 0,
        },
        text: {
          totalScore: modePerformance.text.totalScore,
          totalSessions: modePerformance.text.totalSessions,
          avgFocus: modePerformance.text.totalSessions > 0 
            ? Math.round(modePerformance.text.avgFocus / modePerformance.text.totalSessions) 
            : 0,
        },
      },
    };
  } catch (error) {
    console.error("Error in recommendLearningMode:", error);
    return {
      recommendedMode: "visual",
      confidence: 0.3,
      reasoning: "Unable to analyze learning history. Starting with Visual Learning is recommended.",
      modeStats: {
        visual: { totalScore: 0, totalSessions: 0, avgFocus: 0 },
        audio: { totalScore: 0, totalSessions: 0, avgFocus: 0 },
        text: { totalScore: 0, totalSessions: 0, avgFocus: 0 },
      },
    };
  }
}

/**
 * 2. LEARNING PATH OPTIMIZATION
 * Suggests optimal learning sequence based on user progress
 */
export async function optimizeLearningPath(userId, subject) {
  try {
    const { data: activities, error } = await supabaseClient
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", subject)
      .order("session_date", { ascending: false });

    if (error) throw error;

    // Analyze performance trends
    const recentScores = activities
      .slice(0, 10)
      .map((a) => a.quiz_score || 0)
      .filter((s) => s > 0);

    if (recentScores.length === 0) {
      return {
        recommendation: "beginner",
        nextTopics: [],
        difficulty: "easy",
      };
    }

    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const trend = recentScores[0] - recentScores[recentScores.length - 1];

    // Determine difficulty adjustment
    let difficulty = "medium";
    if (avgScore > 80 && trend > 0) {
      difficulty = "hard";
    } else if (avgScore < 60 || trend < -10) {
      difficulty = "easy";
    }

    return {
      recommendation: avgScore > 70 ? "advanced" : avgScore > 50 ? "intermediate" : "beginner",
      nextTopics: generateTopicSuggestions(subject, difficulty),
      difficulty: difficulty,
      avgScore: avgScore,
      trend: trend,
    };
  } catch (error) {
    console.error("Error in optimizeLearningPath:", error);
    return {
      recommendation: "beginner",
      nextTopics: [],
      difficulty: "medium",
    };
  }
}

function generateTopicSuggestions(subject, difficulty) {
  // This would typically come from a knowledge graph or curriculum database
  const topicMap = {
    math: {
      easy: ["Basic Arithmetic", "Number Patterns", "Simple Geometry"],
      medium: ["Algebra Basics", "Fractions", "Decimals"],
      hard: ["Calculus", "Linear Algebra", "Statistics"],
    },
    science: {
      easy: ["Basic Biology", "Simple Physics", "Chemistry Basics"],
      medium: ["Cell Biology", "Mechanics", "Organic Chemistry"],
      hard: ["Genetics", "Quantum Physics", "Biochemistry"],
    },
  };

  return topicMap[subject?.toLowerCase()]?.[difficulty] || [];
}

/**
 * 3. PERFORMANCE PREDICTION
 * Predicts user's future performance based on historical data
 */
export async function predictPerformance(userId, subject, upcomingTopics) {
  try {
    const { data: activities, error } = await supabaseClient
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", subject)
      .order("session_date", { ascending: false })
      .limit(30);

    if (error) throw error;

    if (activities.length < 5) {
      return {
        predictedScore: 65,
        confidence: 0.3,
        factors: ["Insufficient historical data"],
      };
    }

    // Simple linear regression for prediction
    const scores = activities
      .map((a) => a.quiz_score)
      .filter((s) => s !== null && s !== undefined);

    if (scores.length === 0) {
      return { predictedScore: 65, confidence: 0.3, factors: [] };
    }

    // Calculate trend
    const recentAvg = scores.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, scores.length);
    const olderAvg =
      scores.length > 5
        ? scores.slice(5, 10).reduce((a, b) => a + b, 0) / Math.min(5, scores.length - 5)
        : recentAvg;

    const trend = recentAvg - olderAvg;
    const predictedScore = Math.max(0, Math.min(100, recentAvg + trend * 0.5));

    // Calculate confidence based on data consistency
    const variance = calculateVariance(scores);
    const confidence = Math.max(0.3, Math.min(0.9, 1 - variance / 1000));

    return {
      predictedScore: Math.round(predictedScore),
      confidence: confidence,
      factors: [
        `Recent average: ${Math.round(recentAvg)}%`,
        `Trend: ${trend > 0 ? "improving" : "declining"}`,
        `Data points: ${scores.length}`,
      ],
    };
  } catch (error) {
    console.error("Error in predictPerformance:", error);
    return { predictedScore: 65, confidence: 0.3, factors: ["Error in prediction"] };
  }
}

function calculateVariance(numbers) {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * 4. ENGAGEMENT ANALYSIS
 * Detects anomalies in user engagement and focus levels
 */
export async function analyzeEngagement(userId, days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: activities, error } = await supabaseClient
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("session_date", startDate.toISOString())
      .order("session_date", { ascending: true });

    if (error) throw error;

    if (!activities || activities.length === 0) {
      return {
        engagementScore: 0,
        status: "no_activity",
        alerts: ["No activity recorded in the last 7 days"],
        recommendations: ["Start a learning session to begin tracking"],
      };
    }

    // Calculate engagement metrics
    const avgFocus = activities.reduce((sum, a) => sum + (a.focus_level || 0), 0) / activities.length;
    const totalTime = activities.reduce((sum, a) => sum + (a.reading_time || 0) + (a.playback_time || 0), 0);
    const avgScore = activities
      .filter((a) => a.quiz_score !== null)
      .reduce((sum, a) => sum + a.quiz_score, 0) / activities.filter((a) => a.quiz_score !== null).length || 0;

    // Detect anomalies (sudden drops in focus/performance)
    const recentFocus = activities.slice(-5).map((a) => a.focus_level || 0);
    const olderFocus = activities.slice(0, Math.max(0, activities.length - 5)).map((a) => a.focus_level || 0);
    const focusDrop = olderFocus.length > 0
      ? recentFocus.reduce((a, b) => a + b, 0) / recentFocus.length -
        olderFocus.reduce((a, b) => a + b, 0) / olderFocus.length
      : 0;

    // Calculate engagement score (0-100)
    const engagementScore = Math.min(
      100,
      (avgFocus * 0.4 + (totalTime / 60) * 0.3 + avgScore * 0.3)
    );

    const alerts = [];
    if (focusDrop < -20) {
      alerts.push("Significant drop in focus level detected");
    }
    if (avgScore < 50 && activities.length > 3) {
      alerts.push("Performance below average - consider reviewing previous topics");
    }
    if (totalTime < 30) {
      alerts.push("Low study time - aim for at least 30 minutes per day");
    }

    const recommendations = [];
    if (engagementScore < 50) {
      recommendations.push("Try switching learning modes");
      recommendations.push("Take breaks between study sessions");
      recommendations.push("Set specific learning goals");
    }

    return {
      engagementScore: Math.round(engagementScore),
      status: engagementScore > 70 ? "high" : engagementScore > 50 ? "medium" : "low",
      avgFocus: Math.round(avgFocus),
      totalTime: Math.round(totalTime),
      avgScore: Math.round(avgScore),
      alerts: alerts,
      recommendations: recommendations,
      trend: focusDrop < -10 ? "declining" : focusDrop > 10 ? "improving" : "stable",
    };
  } catch (error) {
    console.error("Error in analyzeEngagement:", error);
    return {
      engagementScore: 0,
      status: "error",
      alerts: ["Error analyzing engagement"],
      recommendations: [],
    };
  }
}

/**
 * 5. PERSONALIZED CONTENT RECOMMENDATION
 * Recommends content based on user's learning style and performance
 */
export async function recommendContent(userId, subject) {
  try {
    // Get user preferences
    const { data: user, error: userError } = await supabaseClient
      .from("users")
      .select("learning_style, preferred_language")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    // Get activity patterns
    const { data: activities, error: activityError } = await supabaseClient
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", subject)
      .order("session_date", { ascending: false })
      .limit(20);

    if (activityError) throw activityError;

    // Analyze what works best
    const modeRecommendation = await recommendLearningMode(userId, subject);
    const pathOptimization = await optimizeLearningPath(userId, subject);

    return {
      recommendedMode: modeRecommendation.recommendedMode,
      difficulty: pathOptimization.difficulty,
      topics: pathOptimization.nextTopics,
      learningStyle: user.learning_style,
      confidence: modeRecommendation.confidence,
      reasoning: modeRecommendation.reasoning,
    };
  } catch (error) {
    console.error("Error in recommendContent:", error);
    return {
      recommendedMode: "visual",
      difficulty: "medium",
      topics: [],
      learningStyle: "mixed",
      confidence: 0.5,
      reasoning: "Using default recommendations",
    };
  }
}

/**
 * 6. ADAPTIVE QUIZ DIFFICULTY
 * Adjusts quiz difficulty based on user performance
 */
export function calculateAdaptiveDifficulty(recentScores, currentDifficulty = "medium") {
  if (!recentScores || recentScores.length === 0) {
    return currentDifficulty;
  }

  const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const lastScore = recentScores[0];

  // Adjust difficulty based on performance
  if (avgScore > 85 && lastScore > 80) {
    return "hard";
  } else if (avgScore < 60 || lastScore < 50) {
    return "easy";
  } else {
    return "medium";
  }
}

