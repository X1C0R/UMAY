// AI Service - AI Content Generation API calls
import { getToken } from './storage';

const LOCAL_IP = '192.168.100.5';

const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
   // Update this to match your server IP
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
 * Generated Content Response
 */
export interface GeneratedContent {
  title: string;
  learningMode: 'visual' | 'audio' | 'text';
  mlConfidence?: number;
  mlReasoning?: string;
  // Visual content
  visualElements?: Array<{
    type: string;
    description: string;
    content: string;
    colorScheme?: string;
    imageUrl?: string; // URL to generated image
    imagePrompt?: string; // Prompt used for image generation
  }>;
  stepByStepGuide?: Array<{
    step: number;
    visualDescription: string;
    explanation: string;
  }>;
  visualMnemonics?: Array<{
    concept: string;
    visualMnemonic: string;
  }>;
  // Audio content
  audioIntroduction?: string;
  mainContent?: Array<{
    section: string;
    audioScript: string;
    keyPoints: string[];
    verbalMnemonic?: string;
  }>;
  discussionQuestions?: Array<{
    question: string;
    audioPrompt: string;
  }>;
  audioSummary?: string;
  audioFiles?: {
    combined?: string; // Single combined audio file
    introduction?: string;
    sections?: Array<{
      sectionIndex: number;
      audioUrl: string;
      section: string;
    }>;
    summary?: string;
  };
  // Text content
  sections?: Array<{
    heading: string;
    content: string;
    keyConcepts: string[];
    examples?: Array<{
      example: string;
      explanation: string;
    }>;
  }>;
  caseStudies?: Array<{
    title: string;
    description: string;
    analysis: string;
  }>;
  // Common
  practiceProblems?: Array<{
    problem: string;
    hint?: string;
    solution: string;
    explanation?: string;
  }>;
  summary?: string;
  // Video content (generated programmatically)
  videoUrl?: string; // URL to generated video tutorial
  // Related video links (AI-suggested external videos)
  relatedVideoLinks?: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

/**
 * Quiz Question
 */
export interface QuizQuestion {
  id: number;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  hint: string;
  points: number;
}

/**
 * Quiz Response
 */
export interface QuizResponse {
  questions: QuizQuestion[];
  totalPoints: number;
  learningMode: 'visual' | 'audio' | 'text';
}

/**
 * Generate personalized content (ML + AI combined)
 * This is the main endpoint - it uses ML to determine learning mode, then generates AI content
 */
export async function generateContent(
  subject: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<GeneratedContent> {
  try {
    const headers = await getAuthHeaders();
    const url = `${API_URL}/api/ai/generate-content`;
    
    console.log('Generating content:', { subject, topic, difficulty, url });
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subject,
        topic,
        difficulty,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Failed to generate content (Status: ${response.status})`;
      try {
        const errorData = await response.json();
        // Extract error message from various possible formats
        errorMessage = errorData.error || errorData.message || errorData.details || errorMessage;
        
        // Ensure it's a string
        if (typeof errorMessage === 'object') {
          console.error('API Error Response (object):', errorData);
          errorMessage = errorData.error?.message || errorData.message?.error || 'Failed to generate content';
        } else {
          console.error('API Error Response:', errorData);
        }
      } catch (parseError) {
        const textError = await response.text().catch(() => '');
        console.error('API Error Text:', textError);
        if (textError) {
          try {
            const parsed = JSON.parse(textError);
            errorMessage = parsed.error || parsed.message || textError;
          } catch {
            errorMessage = textError || errorMessage;
          }
        }
      }
      throw new Error(String(errorMessage));
    }

    const data = await response.json();
    
    if (!data.content) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response from server: content not found');
    }
    
    return data.content as GeneratedContent;
  } catch (error: any) {
    console.error('Error generating content:', {
      message: error.message,
      stack: error.stack,
      subject,
      topic,
      difficulty,
    });
    
    // Provide more helpful error messages
    if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
      throw new Error(`Cannot connect to server at ${API_URL}. Make sure the server is running and the IP address is correct.`);
    }
    
    if (error.message?.includes('No authentication token')) {
      throw new Error('Please login to generate content.');
    }
    
    throw error;
  }
}

/**
 * Generate content for a specific learning mode (override ML recommendation)
 */
export async function generateContentForMode(
  subject: string,
  topic: string,
  learningMode: 'visual' | 'audio' | 'text',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<GeneratedContent> {
  try {
    const headers = await getAuthHeaders();
    const url = `${API_URL}/api/ai/generate-content-for-mode`;
    
    console.log('Generating content for mode:', { subject, topic, learningMode, difficulty, url });
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subject,
        topic,
        learningMode,
        difficulty,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Failed to generate content (Status: ${response.status})`;
      try {
        const errorData = await response.json();
        // Extract error message from various possible formats
        errorMessage = errorData.error || errorData.message || errorData.details || errorMessage;
        
        // Ensure it's a string
        if (typeof errorMessage === 'object') {
          console.error('API Error Response (object):', errorData);
          errorMessage = errorData.error?.message || errorData.message?.error || 'Failed to generate content';
        } else {
          console.error('API Error Response:', errorData);
        }
      } catch (parseError) {
        const textError = await response.text().catch(() => '');
        console.error('API Error Text:', textError);
        if (textError) {
          try {
            const parsed = JSON.parse(textError);
            errorMessage = parsed.error || parsed.message || textError;
          } catch {
            errorMessage = textError || errorMessage;
          }
        }
      }
      throw new Error(String(errorMessage));
    }

    const data = await response.json();
    
    if (!data.content) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response from server: content not found');
    }
    
    return data.content as GeneratedContent;
  } catch (error: any) {
    console.error('Error generating content for mode:', {
      message: error.message,
      stack: error.stack,
      subject,
      topic,
      learningMode,
      difficulty,
    });
    
    // Provide more helpful error messages
    if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
      throw new Error(`Cannot connect to server at ${API_URL}. Make sure the server is running and the IP address is correct.`);
    }
    
    if (error.message?.includes('No authentication token')) {
      throw new Error('Please login to generate content.');
    }
    
    throw error;
  }
}

/**
 * Generate quiz questions based on learning mode
 */
export async function generateQuiz(
  subject: string,
  topic: string,
  learningMode?: 'visual' | 'audio' | 'text',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  numQuestions: number = 5
): Promise<QuizResponse> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/ai/generate-quiz`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subject,
        topic,
        learningMode: learningMode || null, // null = use ML recommendation
        difficulty,
        numQuestions,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || `Failed to generate quiz: ${response.status}`);
    }

    const data = await response.json();
    return {
      questions: data.quiz.questions,
      totalPoints: data.quiz.totalPoints,
      learningMode: data.learningMode,
    } as QuizResponse;
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    throw error;
  }
}

/**
 * Generate study summary
 */
export async function generateStudySummary(
  subject: string,
  learningMode?: 'visual' | 'audio' | 'text'
): Promise<any> {
  try {
    const headers = await getAuthHeaders();
    const url = learningMode
      ? `${API_URL}/api/ai/study-summary?subject=${encodeURIComponent(subject)}&learningMode=${learningMode}`
      : `${API_URL}/api/ai/study-summary?subject=${encodeURIComponent(subject)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || `Failed to generate summary: ${response.status}`);
    }

    const data = await response.json();
    return data.summary;
  } catch (error: any) {
    console.error('Error generating study summary:', error);
    throw error;
  }
}

/**
 * Generate explanation for wrong answer
 */
export async function explainAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  subject: string,
  learningMode?: 'visual' | 'audio' | 'text'
): Promise<any> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/ai/explain-answer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question,
        userAnswer,
        correctAnswer,
        subject,
        learningMode: learningMode || null, // null = use ML recommendation
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || `Failed to generate explanation: ${response.status}`);
    }

    const data = await response.json();
    return data.explanation;
  } catch (error: any) {
    console.error('Error generating explanation:', error);
    throw error;
  }
}

