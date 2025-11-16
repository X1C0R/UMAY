// ML Service - Machine Learning API calls
import { getToken } from './storage';

const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const LOCAL_IP = '192.168.100.66'; // Update this to match your server IP
  return `http://${LOCAL_IP}:4000`;
};

const API_URL = getApiBaseUrl();

/**
 * Get authentication headers
 */
async function getAuthHeaders() {
  const token = await getToken();
  if (!token) {
    throw new Error('No authentication token found. Please login.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * ML Recommendation Response
 */
export interface MLRecommendation {
  recommendedMode: 'visual' | 'audio' | 'text';
  confidence: number;
  reasoning: string;
  modeStats?: {
    visual?: { totalScore: number; totalSessions: number; avgFocus: number };
    audio?: { totalScore: number; totalSessions: number; avgFocus: number };
    text?: { totalScore: number; totalSessions: number; avgFocus: number };
  };
}

/**
 * Learning Path Response
 */
export interface LearningPath {
  recommendation: 'beginner' | 'intermediate' | 'advanced';
  nextTopics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  avgScore?: number;
  trend?: number;
}

/**
 * Performance Prediction Response
 */
export interface PerformancePrediction {
  predictedScore: number;
  confidence: number;
  factors: string[];
}

/**
 * Engagement Analysis Response
 */
export interface EngagementAnalysis {
  engagementScore: number;
  status: 'high' | 'medium' | 'low' | 'no_activity';
  avgFocus: number;
  totalTime: number;
  avgScore: number;
  alerts: string[];
  recommendations: string[];
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Get recommended learning mode based on ML analysis
 */
export async function getRecommendedMode(subject?: string): Promise<MLRecommendation> {
  try {
    const headers = await getAuthHeaders();
    const url = subject 
      ? `${API_URL}/api/ml/recommend-mode?subject=${encodeURIComponent(subject)}`
      : `${API_URL}/api/ml/recommend-mode`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to get recommendation: ${response.status}`);
    }

    const data = await response.json();
    return data.recommendation as MLRecommendation;
  } catch (error: any) {
    console.error('Error getting ML recommendation:', error);
    throw error;
  }
}

/**
 * Get optimized learning path
 */
export async function getLearningPath(subject?: string): Promise<LearningPath> {
  try {
    const headers = await getAuthHeaders();
    const url = subject
      ? `${API_URL}/api/ml/learning-path?subject=${encodeURIComponent(subject)}`
      : `${API_URL}/api/ml/learning-path`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to get learning path: ${response.status}`);
    }

    const data = await response.json();
    return data.learningPath as LearningPath;
  } catch (error: any) {
    console.error('Error getting learning path:', error);
    throw error;
  }
}

/**
 * Predict future performance
 */
export async function predictPerformance(
  subject: string,
  upcomingTopics?: string[]
): Promise<PerformancePrediction> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/ml/predict-performance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subject,
        upcomingTopics: upcomingTopics || [],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to predict performance: ${response.status}`);
    }

    const data = await response.json();
    return data.prediction as PerformancePrediction;
  } catch (error: any) {
    console.error('Error predicting performance:', error);
    throw error;
  }
}

/**
 * Analyze user engagement
 */
export async function analyzeEngagement(days: number = 7): Promise<EngagementAnalysis> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/ml/engagement?days=${days}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to analyze engagement: ${response.status}`);
    }

    const data = await response.json();
    return data.engagement as EngagementAnalysis;
  } catch (error: any) {
    console.error('Error analyzing engagement:', error);
    throw error;
  }
}

/**
 * Get content recommendations
 */
export async function getContentRecommendations(subject?: string): Promise<any> {
  try {
    const headers = await getAuthHeaders();
    const url = subject
      ? `${API_URL}/api/ml/recommend-content?subject=${encodeURIComponent(subject)}`
      : `${API_URL}/api/ml/recommend-content`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to get recommendations: ${response.status}`);
    }

    const data = await response.json();
    return data.recommendations;
  } catch (error: any) {
    console.error('Error getting content recommendations:', error);
    throw error;
  }
}

/**
 * Calculate adaptive difficulty
 */
export async function calculateAdaptiveDifficulty(
  recentScores: number[],
  currentDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<'easy' | 'medium' | 'hard'> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/ml/adaptive-difficulty`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        recentScores,
        currentDifficulty,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to calculate difficulty: ${response.status}`);
    }

    const data = await response.json();
    return data.difficulty as 'easy' | 'medium' | 'hard';
  } catch (error: any) {
    console.error('Error calculating adaptive difficulty:', error);
    throw error;
  }
}

