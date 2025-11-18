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
    
    // Also fetch quiz results from dedicated quiz table for better analysis
    let quizQuery = supabaseClient
      .from("quiz_results")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(100);
    
    if (subject) {
      quizQuery = quizQuery.eq("subject", subject);
    }
    
    const { data: quizResults, error: quizError } = await quizQuery;
    
    if (quizError) {
      console.warn("Error fetching quiz results (non-critical):", quizError);
    }

    // If no activities but we have quiz results, use quiz data
    if ((!activities || activities.length === 0) && (!quizResults || quizResults.length === 0)) {
      // Default recommendation for new users
      return {
        recommendedMode: "visual",
        bestPerformingMode: "visual", // Default to visual for new users
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

    // Process activity logs
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
    
    // Process quiz results from dedicated quiz table (more accurate quiz data)
    if (quizResults && quizResults.length > 0) {
      quizResults.forEach((quiz) => {
        const mode = quiz.learning_type?.toLowerCase() || "visual";
        if (modePerformance[mode]) {
          const quizScore = parseFloat(quiz.score) || 0;
          
          // Add quiz score to mode performance
          modePerformance[mode].totalScore += quizScore;
          modePerformance[mode].totalSessions += 1;
          
          // Quiz scores are more reliable than activity_logs quiz_score
          // Use quiz score to estimate focus level
          const estimatedFocus = quizScore >= 80 ? 85 : quizScore >= 60 ? 70 : 50;
          modePerformance[mode].avgFocus += estimatedFocus;
          
          // Calculate engagement based on quiz performance
          // Higher quiz scores indicate better engagement
          const engagement = Math.min(100, quizScore);
          modePerformance[mode].engagementScore += engagement;
        }
      });
    }

    // Calculate weighted scores with engagement metrics
    let bestMode = "visual";
    let bestScore = 0;
    const modeScores = {};
    
    // Also track best performing mode (highest average quiz score) for topic generation
    let bestPerformingMode = "visual";
    let bestPerformingScore = 0;

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
        
        // Track best performing mode (highest average quiz score only)
        // This is used for topic generation - what the user excels in
        if (avgScore > bestPerformingScore) {
          bestPerformingScore = avgScore;
          bestPerformingMode = mode;
        }
      } else {
        modeScores[mode] = 0;
      }
    });

    // Calculate confidence based on data quality and consistency
    // Include quiz results in total sessions count for better analysis
    const totalSessions = (activities?.length || 0) + (quizResults?.length || 0);
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
    if (quizResults && quizResults.length > 0) {
      reasoning += ` (including ${quizResults.length} quiz result${quizResults.length !== 1 ? 's' : ''})`;
    }
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
      recommendedMode: bestMode, // Best mode based on weighted score (quiz + focus + engagement)
      bestPerformingMode: bestPerformingScore > 0 ? bestPerformingMode : bestMode, // Best mode based on quiz score only (for topic generation)
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
      bestPerformingMode: "visual", // Default fallback
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
      nextTopics: [], // Topics are now generated dynamically based on the actual subject from database
      difficulty: difficulty,
      avgScore: avgScore,
      trend: trend,
    };
  } catch (error) {
    console.error("Error in optimizeLearningPath:", error);
    return {
      recommendation: "beginner",
      nextTopics: [], // Topics are now generated dynamically based on the actual subject from database
      difficulty: "medium",
    };
  }
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

/**
 * 7. COMPREHENSIVE ANALYTICS
 * Aggregates all analytics data for the analytics dashboard
 */
export async function getComprehensiveAnalytics(userId, subject) {
  try {
    // Fetch all data in parallel for better performance
    const [modeRecommendation, engagement, quizResults] = await Promise.all([
      recommendLearningMode(userId, subject),
      analyzeEngagement(userId, 30), // Last 30 days
      getQuizHistoryForAnalytics(userId, subject),
    ]);

    // Process quiz scores by learning type
    const quizScoresByType = {
      visual: [],
      audio: [],
      text: [],
    };

    if (quizResults && quizResults.length > 0) {
      quizResults.forEach((quiz) => {
        const learningType = (quiz.learning_type || quiz.learningType || 'visual').toLowerCase();
        if (learningType === 'visual' || learningType === 'audio' || learningType === 'text') {
          const score = parseFloat(quiz.score) || 0;
          quizScoresByType[learningType].push([score, 100]); // Score is already a percentage
        }
      });
    }

    // If no quiz data, use mode stats to generate data points
    if (quizScoresByType.visual.length === 0 && 
        quizScoresByType.audio.length === 0 && 
        quizScoresByType.text.length === 0) {
      const modeStats = modeRecommendation.modeStats;
      if (modeStats) {
        if (modeStats.visual && modeStats.visual.totalSessions > 0) {
          const avgScore = modeStats.visual.totalScore / modeStats.visual.totalSessions;
          quizScoresByType.visual = Array(Math.min(modeStats.visual.totalSessions, 10))
            .fill([avgScore, 100]);
        }
        if (modeStats.audio && modeStats.audio.totalSessions > 0) {
          const avgScore = modeStats.audio.totalScore / modeStats.audio.totalSessions;
          quizScoresByType.audio = Array(Math.min(modeStats.audio.totalSessions, 10))
            .fill([avgScore, 100]);
        }
        if (modeStats.text && modeStats.text.totalSessions > 0) {
          const avgScore = modeStats.text.totalScore / modeStats.text.totalSessions;
          quizScoresByType.text = Array(Math.min(modeStats.text.totalSessions, 10))
            .fill([avgScore, 100]);
        }
      }
    }

    // Calculate subject performance
    const subjectMap = new Map();
    if (quizResults && quizResults.length > 0) {
      quizResults.forEach((quiz) => {
        const subj = quiz.subject || 'General';
        const score = parseFloat(quiz.score) || 0;
        
        if (!subjectMap.has(subj)) {
          subjectMap.set(subj, { total: 0, count: 0 });
        }
        const current = subjectMap.get(subj);
        current.total += score;
        current.count += 1;
      });
    }

    const subjectPerformance = [];
    const colors = ["#38BDF8", "#A855F7", "#F97316", "#22C55E", "#EF4444", "#F59E0B"];
    let colorIndex = 0;
    let totalAll = 0;
    let countAll = 0;

    subjectMap.forEach((value, subj) => {
      const avg = Math.round(value.total / value.count);
      subjectPerformance.push({
        label: subj.charAt(0).toUpperCase() + subj.slice(1),
        percent: avg,
        color: colors[colorIndex % colors.length],
      });
      totalAll += value.total;
      countAll += value.count;
      colorIndex++;
    });

    // Sort by performance (highest first)
    subjectPerformance.sort((a, b) => b.percent - a.percent);

    // Calculate overall average
    const overallPercent = countAll > 0 ? Math.round(totalAll / countAll) : 0;

    // Prepare analytics data for AI suggestions
    const analyticsDataForAI = {
      quizScores: quizScoresByType,
      subjectPerformance,
      overallPercent,
      modeRecommendation,
      engagement,
    };

    // Generate AI-powered improvement suggestions (async, don't block)
    let improvementSuggestions = [];
    try {
      improvementSuggestions = await generateImprovementSuggestions(userId, analyticsDataForAI);
    } catch (suggestionError) {
      console.warn('Failed to generate AI suggestions, using defaults:', suggestionError.message);
      improvementSuggestions = generateDefaultSuggestions(analyticsDataForAI);
    }

    return {
      quizScores: quizScoresByType,
      subjectPerformance,
      overallPercent,
      modeRecommendation,
      engagement,
      improvementSuggestions,
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in getComprehensiveAnalytics:", error);
    throw error;
  }
}

/**
 * Helper function to get quiz history for analytics
 */
async function getQuizHistoryForAnalytics(userId, subject, limit = 50) {
  try {
    let query = supabaseClient
      .from("quiz_results")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (subject) {
      query = query.eq("subject", subject);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Error fetching quiz history for analytics:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getQuizHistoryForAnalytics:", error);
    return [];
  }
}

/**
 * 8. AI-POWERED IMPROVEMENT SUGGESTIONS
 * Generates personalized improvement suggestions based on ML analytics data
 */
export async function generateImprovementSuggestions(userId, analyticsData) {
  try {
    const { modeRecommendation, engagement, quizScores, subjectPerformance, overallPercent } = analyticsData;

    // Build context from analytics data
    const context = {
      recommendedMode: modeRecommendation?.recommendedMode || 'visual',
      confidence: modeRecommendation?.confidence || 0,
      engagementScore: engagement?.engagementScore || 0,
      engagementStatus: engagement?.status || 'low',
      engagementTrend: engagement?.trend || 'stable',
      avgFocus: engagement?.avgFocus || 0,
      avgScore: engagement?.avgScore || 0,
      overallPercent: overallPercent || 0,
      modeStats: modeRecommendation?.modeStats || {},
      subjectPerformance: subjectPerformance || [],
      alerts: engagement?.alerts || [],
      recommendations: engagement?.recommendations || [],
    };

    // Create prompt for AI (same format as topics generation)
    const prompt = `You are an expert learning coach analyzing a student's learning analytics data. Based on the following data, provide 3-5 specific, actionable improvement suggestions.

Learning Analytics Data:
- Recommended Learning Mode: ${context.recommendedMode} (confidence: ${(context.confidence * 100).toFixed(0)}%)
- Overall Performance: ${context.overallPercent}%
- Engagement Score: ${context.engagementScore}% (Status: ${context.engagementStatus}, Trend: ${context.engagementTrend})
- Average Focus Level: ${context.avgFocus}%
- Average Quiz Score: ${context.avgScore}%

Mode Performance:
${Object.entries(context.modeStats).map(([mode, stats]) => 
  `- ${mode}: ${stats.totalSessions || 0} sessions, avg score: ${stats.totalScore && stats.totalSessions ? Math.round(stats.totalScore / stats.totalSessions) : 0}%, avg focus: ${stats.avgFocus || 0}%`
).join('\n')}

Subject Performance:
${context.subjectPerformance.map(subj => `- ${subj.label}: ${subj.percent}%`).join('\n') || 'No subject data available'}

Current Alerts: ${context.alerts.length > 0 ? context.alerts.join('; ') : 'None'}
Current Recommendations: ${context.recommendations.length > 0 ? context.recommendations.join('; ') : 'None'}

Format as JSON:
{
  "suggestions": [
    "Suggestion 1 text (1-2 sentences, specific and actionable)",
    "Suggestion 2 text (1-2 sentences, specific and actionable)",
    "Suggestion 3 text (1-2 sentences, specific and actionable)"
  ]
}

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY valid, complete JSON. Do NOT use markdown code blocks (no \`\`\`json or \`\`\`).
2. Start with { and end with }. Return ONLY the JSON object, nothing else.
3. Provide 3-5 specific, actionable improvement suggestions
4. Each suggestion should be concise (1-2 sentences max, 20-40 words)
5. Focus on the weakest areas identified in the data
6. Be encouraging and constructive
7. Prioritize suggestions that address the most critical issues`;

    try {
      // Use the same callAI function as topics generation
      const aiService = await import('./ai-content-service.js');
      
      // Access the internal callAI function (it's not exported, so we need to use generateTopics pattern)
      // Instead, we'll use a helper that mimics the callAI pattern
      const response = await callAIForSuggestions(prompt, {
        temperature: 0.8,
        max_tokens: 1500,
      });

      // Parse the response (same format as topics)
      let jsonData;
      if (typeof response === 'string') {
        // Try to parse JSON from string
        let jsonContent = response.trim();
        
        // Remove markdown code blocks if present
        jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        
        // Find JSON object
        const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0];
        }
        
        jsonData = JSON.parse(jsonContent);
      } else {
        jsonData = response;
      }

      // Ensure we have suggestions array
      if (jsonData.suggestions && Array.isArray(jsonData.suggestions)) {
        return jsonData.suggestions.slice(0, 5);
      } else if (Array.isArray(jsonData)) {
        // Handle case where AI returns array directly
        return jsonData.slice(0, 5);
      } else {
        throw new Error('Invalid response format: suggestions array not found');
      }
    } catch (aiError) {
      console.warn('AI suggestion generation failed, using defaults:', aiError.message);
      return generateDefaultSuggestions(analyticsData);
    }
  } catch (error) {
    console.error("Error generating improvement suggestions:", error);
    return generateDefaultSuggestions(analyticsData);
  }
}

/**
 * Helper function to call AI (similar to callAI in ai-content-service.js)
 * This uses the same pattern as topics generation
 */
async function callAIForSuggestions(prompt, options = {}) {
  // Import AI service to access the callAI function
  // Since callAI is not exported, we'll recreate the pattern
  const aiService = await import('./ai-content-service.js');
  
  // Check if we can access the internal callAI
  // If not, we'll use the geminiClient directly with the same pattern
  try {
    // Try to use the AI service's internal method
    // Since we can't access callAI directly, we'll use the geminiClient pattern
    const genAI = (await import('./geminiClient.js')).default;
    if (!genAI) {
      throw new Error("AI not configured");
    }

    // Use the same pattern as callGoogleAI in ai-content-service.js
    const googleAI = new (await import('@google/genai')).GoogleGenAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    });

    const modelName = 'gemini-2.0-flash-exp';
    const enhancedPrompt = prompt + '\n\nCRITICAL INSTRUCTIONS:\n1. You MUST respond with ONLY valid, complete JSON. Do NOT use markdown code blocks (no ```json or ```).\n2. Start with { and end with }. Return ONLY the JSON object, nothing else.';

    const config = {
      temperature: options.temperature || 0.8,
      maxOutputTokens: options.max_tokens || 1500,
      responseMimeType: 'application/json', // Request JSON response
    };

    const contents = [{
      role: 'user',
      parts: [{ text: enhancedPrompt }],
    }];

    // Use non-streaming for more reliable JSON parsing
    const response = await googleAI.models.generateContent({
      model: modelName,
      config: config,
      contents: contents,
    });

    // Extract text from response
    let content = '';
    if (response.text) {
      content = response.text;
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      content = response.candidates[0].content.parts[0].text;
    } else if (typeof response === 'string') {
      content = response;
    }

    if (!content) {
      throw new Error('Empty response from AI');
    }

    return content;
  } catch (error) {
    console.error('Error calling AI for suggestions:', error);
    throw error;
  }
}

/**
 * Generate default suggestions based on analytics data (fallback when AI is unavailable)
 */
function generateDefaultSuggestions(analyticsData) {
  const suggestions = [];
  const { modeRecommendation, engagement, overallPercent, subjectPerformance } = analyticsData;

  // Performance-based suggestions
  if (overallPercent < 60) {
    suggestions.push("Your overall performance is below average. Consider reviewing previous topics and focusing on fundamentals before moving to advanced concepts.");
  } else if (overallPercent < 80) {
    suggestions.push("You're making good progress! To improve further, try practicing more frequently and focusing on areas where you scored lower.");
  }

  // Engagement-based suggestions
  if (engagement?.engagementScore < 50) {
    suggestions.push("Your engagement level is low. Try setting specific learning goals and taking regular breaks to maintain focus.");
  }

  if (engagement?.avgFocus < 60) {
    suggestions.push("Your focus level could be improved. Consider studying in a quiet environment and eliminating distractions during learning sessions.");
  }

  // Mode-based suggestions
  if (modeRecommendation?.recommendedMode) {
    const recommendedMode = modeRecommendation.recommendedMode;
    const modeStats = modeRecommendation.modeStats?.[recommendedMode];
    
    if (modeStats && modeStats.totalSessions < 5) {
      suggestions.push(`Try more ${recommendedMode} learning sessions. Based on your performance, this learning style shows promise for you.`);
    }
  }

  // Subject-based suggestions
  if (subjectPerformance && subjectPerformance.length > 0) {
    const weakestSubject = subjectPerformance[subjectPerformance.length - 1];
    if (weakestSubject.percent < 70) {
      suggestions.push(`Focus more on ${weakestSubject.label}. Your performance in this subject is lower than others, so additional practice would be beneficial.`);
    }
  }

  // Trend-based suggestions
  if (engagement?.trend === 'declining') {
    suggestions.push("Your engagement trend is declining. Consider switching learning modes or taking a short break to recharge.");
  }

  // Default suggestion if none generated
  if (suggestions.length === 0) {
    suggestions.push("Keep up the great work! Continue practicing regularly to maintain and improve your performance.");
  }

  return suggestions.slice(0, 5); // Limit to 5 suggestions
}

