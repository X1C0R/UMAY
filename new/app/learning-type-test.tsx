// Learning Type Assessment Screen
// Users can test different learning types to determine their optimal style

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAIContent } from "../hooks/use-ai-content";
import { generateQuiz } from "../lib/ai-service";
import { getRecommendedMode, MLRecommendation } from "../lib/ml-service";
import { getToken } from "../lib/storage";

// Import expo-audio and expo-video (replacing deprecated expo-av)
let Audio: any = null;
let VideoView: any = null;
let useVideoPlayer: any = null;
try {
  const expoAudio = require("expo-audio");
  Audio = expoAudio.Audio;
} catch (error) {
  console.warn("expo-audio not available, using fallback audio player");
}
try {
  // Import VideoView and useVideoPlayer from expo-video
  const expoVideo = require("expo-video");
  VideoView = expoVideo.VideoView;
  useVideoPlayer = expoVideo.useVideoPlayer;
  console.log('✅ expo-video imported successfully');
} catch (error) {
  console.warn("expo-video not available, using fallback video player:", error);
  VideoView = null;
  useVideoPlayer = null;
}

const LEARNING_TYPES = [
  { 
    id: "visual", 
    label: "Visual", 
    icon: "eye",
    description: "Learn through diagrams, charts, and visual aids",
    color: "#0EA5E9"
  },
  { 
    id: "audio", 
    label: "Audio", 
    icon: "headphones",
    description: "Learn through listening, discussions, and verbal explanations",
    color: "#10B981"
  },
  { 
    id: "text", 
    label: "Text", 
    icon: "book-open-variant",
    description: "Learn through reading, written materials, and text-based content",
    color: "#8B5CF6"
  },
];

type TestStep = "selection" | "learning" | "quiz" | "results";

export default function LearningTypeTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string; topic?: string }>();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<TestStep>("selection");
  const [quiz, setQuiz] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizResults, setQuizResults] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [mlRecommendation, setMlRecommendation] = useState<MLRecommendation | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  
  // Engagement tracking state
  const [audioPlayCount, setAudioPlayCount] = useState(0);
  const [readingStartTime, setReadingStartTime] = useState<number | null>(null);
  const [readingTimeSeconds, setReadingTimeSeconds] = useState(0);
  
  const { content, loading: contentLoading, error: contentError, generateForMode } = useAIContent();
  
  const subject = params.subject || "math";
  const topic = params.topic || "Algebra Basics";

  // Helper function to safely render content (handles objects, arrays, strings)
  const renderSafeContent = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(v => renderSafeContent(v)).join(', ');
    if (typeof value === 'object') {
      // If it's an object, try to extract meaningful text
      if (value.text) return String(value.text);
      if (value.content) return String(value.content);
      if (value.summary) return String(value.summary);
      // Otherwise, stringify it
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Helper function to get full audio URL
  const getAudioUrl = (audioPath: string): string => {
    if (!audioPath) return '';
    if (audioPath.startsWith('http')) return audioPath;
    const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://192.168.100.66:4000`;
    return `${API_URL}${audioPath}`;
  };

  // Helper function to get full video URL
  const getVideoUrl = (videoPath: string): string => {
    if (!videoPath) return '';
    if (videoPath.startsWith('http')) return videoPath;
    const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://192.168.100.66:4000`;
    // Ensure videoPath starts with /
    const normalizedPath = videoPath.startsWith('/') ? videoPath : `/${videoPath}`;
    const fullUrl = `${API_URL}${normalizedPath}`;
    console.log('🎥 Constructed video URL:', fullUrl);
    return fullUrl;
  };

  // Audio player state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, any>>({});

  // Debug: Log audioFiles when content changes
  useEffect(() => {
    if (selectedType === "audio" && content) {
      console.log('🔍 Audio Content Debug:', {
        hasAudioFiles: !!content.audioFiles,
        audioFiles: content.audioFiles,
        hasCombinedAudio: !!content.audioFiles?.combined,
        combinedAudioUrl: content.audioFiles?.combined,
      });
    }
  }, [content, selectedType]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (Audio) {
        Object.values(audioRefs.current).forEach(sound => {
          if (sound && sound.unloadAsync) {
            sound.unloadAsync().catch(console.error);
          }
        });
      }
    };
  }, []);

  // Track reading time for text learning
  useEffect(() => {
    if (selectedType === "text" && currentStep === "learning") {
      // Start tracking when entering text learning and content is loaded
      if (readingStartTime === null && content && !contentLoading) {
        const startTime = Date.now();
        setReadingStartTime(startTime);
        setReadingTimeSeconds(0);
      }
      
      // Update reading time every second while on text learning step
      const interval = setInterval(() => {
        if (readingStartTime !== null) {
          const elapsed = Math.floor((Date.now() - readingStartTime) / 1000);
          setReadingTimeSeconds(elapsed);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else if (currentStep !== "learning" && readingStartTime !== null) {
      // Calculate final reading time when leaving learning step
      const finalTime = Math.floor((Date.now() - readingStartTime) / 1000);
      setReadingTimeSeconds(finalTime);
      setReadingStartTime(null);
    }
  }, [selectedType, currentStep, readingStartTime, content, contentLoading]);

  // Audio player component
  const AudioPlayer = ({ audioUrl, label }: { audioUrl: string; label: string }) => {
    const fullUrl = getAudioUrl(audioUrl);
    const isPlaying = playingAudio === fullUrl;

    const handlePlayPause = async () => {
      // Fallback: If Audio is not available, open URL in browser
      if (!Audio) {
        try {
          const canOpen = await Linking.canOpenURL(fullUrl);
          if (canOpen) {
            await Linking.openURL(fullUrl);
          } else {
            console.error('Cannot open audio URL:', fullUrl);
          }
        } catch (error) {
          console.error('Error opening audio URL:', error);
        }
        return;
      }

      try {
        if (isPlaying) {
          // Pause
          const sound = audioRefs.current[fullUrl];
          if (sound) {
            await sound.pauseAsync();
            setPlayingAudio(null);
          }
        } else {
          // Stop any currently playing audio
          if (playingAudio) {
            const currentSound = audioRefs.current[playingAudio];
            if (currentSound) {
              await currentSound.stopAsync();
              await currentSound.unloadAsync();
            }
          }

          // Play new audio
          const { sound } = await Audio.Sound.createAsync(
            { uri: fullUrl },
            { shouldPlay: true }
          );
          audioRefs.current[fullUrl] = sound;
          setPlayingAudio(fullUrl);
          
          // Track audio play count (increment each time audio starts playing)
          if (selectedType === "audio") {
            setAudioPlayCount(prev => prev + 1);
          }

          // Handle playback finish
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded && status.didJustFinish) {
              setPlayingAudio(null);
              sound.unloadAsync().catch(console.error);
              delete audioRefs.current[fullUrl];
            }
          });
        }
      } catch (error) {
        console.error('Audio playback error:', error);
        setPlayingAudio(null);
        // Fallback to opening URL if playback fails
        try {
          await Linking.openURL(fullUrl);
        } catch (linkError) {
          console.error('Error opening audio URL as fallback:', linkError);
        }
      }
    };

    if (!fullUrl) return null;

    return (
      <TouchableOpacity
        style={styles.audioPlayer}
        onPress={handlePlayPause}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={isPlaying ? "pause-circle" : "play-circle"}
          size={32}
          color="#10B981"
        />
        <Text style={styles.audioPlayerLabel}>{label}</Text>
        {isPlaying && <ActivityIndicator size="small" color="#10B981" style={{ marginLeft: 8 }} />}
      </TouchableOpacity>
    );
  };

  // Video player component
  const VideoPlayer = ({ videoUrl, label }: { videoUrl: string; label: string }) => {
    const fullUrl = getVideoUrl(videoUrl);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // expo-video 3.0 REQUIRES useVideoPlayer hook - cannot use source prop directly
    // Hook must be called unconditionally, so we always call it
    const player = useVideoPlayer ? useVideoPlayer(fullUrl || '') : null;
    
    // Configure player when it's created
    useEffect(() => {
      if (player && fullUrl) {
        try {
          player.loop = false;
          player.muted = false;
        } catch (error) {
          console.error('Error configuring player:', error);
        }
      }
    }, [player, fullUrl]);

    // Log video URL for debugging
    useEffect(() => {
      if (fullUrl) {
        console.log('🎥 VideoPlayer - URL:', fullUrl);
        console.log('🎥 VideoPlayer - VideoView available:', !!VideoView);
        console.log('🎥 VideoPlayer - useVideoPlayer available:', !!useVideoPlayer);
        console.log('🎥 VideoPlayer - player created:', !!player);
      }
    }, [fullUrl, player]);

    // Update player source when URL changes (use replaceAsync to avoid iOS UI freezes)
    useEffect(() => {
      if (player && fullUrl) {
        setIsLoading(true);
        // Use replaceAsync instead of replace to avoid iOS UI freezes
        const updateSource = async () => {
          try {
            if (player.replaceAsync) {
              await player.replaceAsync(fullUrl);
            } else {
              // Fallback for older versions
              player.replace(fullUrl);
            }
            setIsLoading(false);
          } catch (error) {
            console.error('Error updating player source:', error);
            setHasError(true);
            setIsLoading(false);
          }
        };
        updateSource();
      } else if (!useVideoPlayer && fullUrl) {
        setIsLoading(false);
      }
    }, [player, fullUrl, useVideoPlayer]);

    if (!fullUrl || !VideoView) {
      return (
        <View style={styles.videoPlaceholder}>
          <MaterialCommunityIcons name="video-off" size={32} color="#94A3B8" />
          <Text style={styles.videoPlaceholderText}>
            {!VideoView ? "Video player not available" : "Video not available"}
          </Text>
          {fullUrl && (
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8 }]}
              onPress={() => Linking.openURL(fullUrl)}
            >
              <Text style={styles.primaryButtonText}>Open Video in Browser</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (hasError) {
      return (
        <View style={styles.videoPlaceholder}>
          <MaterialCommunityIcons name="alert-circle" size={32} color="#EF4444" />
          <Text style={styles.videoPlaceholderText}>
            Unable to load video
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8 }]}
            onPress={() => Linking.openURL(fullUrl)}
          >
            <Text style={styles.primaryButtonText}>Open Video in Browser</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.videoContainer}>
        {isLoading && (
          <View style={[styles.video, { position: 'absolute', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', zIndex: 1 }]}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={[styles.videoPlaceholderText, { color: '#fff', marginTop: 12 }]}>Loading video...</Text>
          </View>
        )}
        {VideoView && player && useVideoPlayer ? (
          // expo-video 3.0 requires player prop (not source prop)
          <VideoView
            player={player}
            style={styles.video}
            nativeControls={true}
            contentFit="contain"
            allowsPictureInPicture={true}
          />
        ) : VideoView ? (
          // Fallback if useVideoPlayer is not available (shouldn't happen in expo-video 3.0)
          <View style={[styles.video, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
            <Text style={[styles.videoPlaceholderText, { color: '#fff', marginTop: 12 }]}>
              Video player hook not available
            </Text>
          </View>
        ) : (
          <View style={[styles.video, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
            <MaterialCommunityIcons name="video-off" size={48} color="#94A3B8" />
            <Text style={[styles.videoPlaceholderText, { color: '#fff', marginTop: 12 }]}>
              Video player not available
            </Text>
          </View>
        )}
        <Text style={styles.videoLabel}>{label}</Text>
      </View>
    );
  };

  const handleSelectType = async (typeId: string) => {
    setSelectedType(typeId);
    setCurrentStep("learning");
    // Reset engagement tracking when switching learning types
    setAudioPlayCount(0);
    setReadingTimeSeconds(0);
    setReadingStartTime(null);
    
    // Generate content for selected learning type
    try {
      await generateForMode(subject, topic, typeId as 'visual' | 'audio' | 'text', "medium");
    } catch (error) {
      console.error("Failed to generate content:", error);
      // Error is already set in the hook, will be displayed in UI
    }
  };

  const handleStartQuiz = async () => {
    console.log("🔵 ========== handleStartQuiz CALLED ==========");
    console.log(`   Selected Type: ${selectedType}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Reading Time State: ${readingTimeSeconds}s`);
    console.log(`   Audio Play Count State: ${audioPlayCount}`);
    console.log(`   Reading Start Time: ${readingStartTime}`);
    
    if (!selectedType) {
      console.error("❌ No selected type, cannot start quiz");
      alert("Please select a learning type first");
      return;
    }
    
    if (!subject || subject.trim() === '') {
      console.error("❌ Subject is missing or empty");
      alert("Subject is required");
      return;
    }
    
    // Calculate final reading time if still tracking
    let finalReadingTime = readingTimeSeconds;
    if (readingStartTime !== null) {
      finalReadingTime = Math.floor((Date.now() - readingStartTime) / 1000);
      setReadingTimeSeconds(finalReadingTime);
      setReadingStartTime(null);
    }
    
    // Log tracked engagement metrics
    console.log("📊 Engagement Metrics Before Quiz:");
    console.log(`   Learning Type: ${selectedType}`);
    console.log(`   Reading Time (seconds): ${finalReadingTime}`);
    console.log(`   Audio Play Count: ${audioPlayCount}`);
    
    // Save engagement data to activity_logs BEFORE starting quiz
    console.log("🔄 Starting engagement data save process...");
    try {
      const token = await getToken();
      console.log(`   Token retrieved: ${token ? 'Yes' : 'No'}`);
      if (!token) {
        console.error("❌ No token found, skipping engagement data save before quiz");
        alert("Authentication error: Please log in again");
        // Still proceed with quiz generation even if save fails
      } else {
        const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.100.66:4000";
        
        // Validate subject before creating payload
        if (!subject || subject.trim() === '') {
          console.error("❌ Subject is empty, cannot save activity");
          throw new Error("Subject is required");
        }
        
        const activityPayload: any = {
          subject: subject.trim(), // Ensure no whitespace
          activity_type: selectedType,
          reading_time: selectedType === "text" ? finalReadingTime : 0,
          playback_time: selectedType === "audio" ? audioPlayCount : 0,
        };
        
        // Validate payload before sending
        if (!activityPayload.subject || !activityPayload.activity_type) {
          console.error("❌ Invalid payload:", activityPayload);
          throw new Error("Missing required fields in payload");
        }
        
        console.log("📤 Saving engagement data to activity_logs before quiz:");
        console.log(`   Endpoint: ${API_URL}/activity`);
        console.log(`   Reading Time: ${activityPayload.reading_time}s`);
        console.log(`   Playback Time: ${activityPayload.playback_time}`);
        console.log(`   Full payload:`, JSON.stringify(activityPayload, null, 2));
        console.log(`   Token present: ${token ? 'Yes' : 'No'}`);
        console.log(`   Token preview: ${token ? token.substring(0, 20) + '...' : 'N/A'}`);
        
        const fetchStartTime = Date.now();
        console.log(`   Sending request at ${new Date().toISOString()}...`);
        
        const activityResponse = await fetch(`${API_URL}/activity`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(activityPayload),
        });
        
        const fetchDuration = Date.now() - fetchStartTime;
        console.log(`   Response received after ${fetchDuration}ms`);
        console.log(`   Response status: ${activityResponse.status} ${activityResponse.statusText}`);
        
        if (!activityResponse.ok) {
          const errorText = await activityResponse.text().catch(() => '');
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          console.error("❌ Failed to save engagement data before quiz:");
          console.error(`   Status: ${activityResponse.status}`);
          console.error(`   Error:`, errorData);
        } else {
          const activityData = await activityResponse.json();
          console.log("✅ ========== SUCCESS: Engagement data saved! ==========");
          console.log(`   Activity ID: ${activityData.activity?.id || 'N/A'}`);
          console.log(`   Saved Reading Time: ${activityData.activity?.reading_time ?? 'N/A'}s`);
          console.log(`   Saved Playback Time: ${activityData.activity?.playback_time ?? 'N/A'}`);
          console.log(`   Saved Subject: ${activityData.activity?.subject || 'N/A'}`);
          console.log(`   Full response:`, JSON.stringify(activityData, null, 2));
          
          // Verify the saved values match what we sent
          if (activityData.activity) {
            const savedRT = activityData.activity.reading_time ?? 0;
            const savedPT = activityData.activity.playback_time ?? 0;
            if (savedRT !== activityPayload.reading_time) {
              console.warn(`⚠️ Reading time mismatch! Sent: ${activityPayload.reading_time}, Saved: ${savedRT}`);
            }
            if (savedPT !== activityPayload.playback_time) {
              console.warn(`⚠️ Playback time mismatch! Sent: ${activityPayload.playback_time}, Saved: ${savedPT}`);
            }
          }
        }
      }
    } catch (activityError) {
      console.error("❌ ========== ERROR saving engagement data ==========");
      console.error("   Error:", activityError);
      console.error("   Error type:", activityError instanceof Error ? activityError.constructor.name : typeof activityError);
      console.error("   Error message:", activityError instanceof Error ? activityError.message : String(activityError));
      console.error("   Error stack:", activityError instanceof Error ? activityError.stack : 'N/A');
      // Don't block quiz generation if this fails, but log the error clearly
    }
    
    // Now proceed with quiz generation
    setQuizLoading(true);
    try {
      const quizData = await generateQuiz(subject, topic, selectedType as any, "medium", 5);
      setQuiz(quizData);
      setCurrentStep("quiz");
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      // Show error to user - you might want to add error state handling here
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    
    // Calculate score
    let correct = 0;
    const results = quiz.questions.map((q: any) => {
      const userAnswer = quizAnswers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correct++;
      return {
        question: q.question,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });
    
    const score = (correct / quiz.questions.length) * 100;
    
    // Determine if user excels with this learning type
    const excels = score >= 80; // 80% or higher = excels
    
    setQuizResults({
      score,
      excels,
      results,
      learningType: selectedType,
    });
    
    setCurrentStep("results");
    
    // Note: Reading time and playback count were already saved to activity_logs 
    // when user clicked "I'm Ready for the Quiz"
    // Now we just need to save quiz results and update adaptive content
    
    // Calculate final reading time for reference (already saved before quiz)
    let finalReadingTime = readingTimeSeconds;
    if (readingStartTime !== null) {
      finalReadingTime = Math.floor((Date.now() - readingStartTime) / 1000);
      setReadingTimeSeconds(finalReadingTime);
      setReadingStartTime(null);
    }
    
    // Log quiz results
    console.log("📊 Quiz Results:");
    console.log(`   Learning Type: ${selectedType}`);
    console.log(`   Quiz Score: ${score}%`);
    console.log(`   Correct: ${correct}/${quiz.questions.length}`);
    
    // Save detailed quiz progress to backend (includes quiz score)
    try {
      const token = await getToken();
      if (!token) {
        console.warn("No token found, skipping quiz progress save");
        return;
      }
      
      const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.100.66:4000";
      
      // Prepare detailed quiz progress data
      const quizProgressData = {
        subject,
        topic,
        learning_type: selectedType,
        difficulty: "medium", // Can be made dynamic if needed
        total_questions: quiz.questions.length,
        correct_answers: correct,
        score: score,
        time_taken: null, // Can be tracked if needed
        audio_play_count: selectedType === "audio" ? audioPlayCount : 0,
        video_play_count: 0, // For future video implementation
        reading_time_seconds: selectedType === "text" ? finalReadingTime : 0,
        responses: quiz.questions.map((q: any, index: number) => ({
          question_id: q.id || index,
          question_text: q.question,
          question_type: q.type || "multiple_choice",
          user_answer: quizAnswers[q.id] || null,
          correct_answer: q.correctAnswer,
          is_correct: quizAnswers[q.id] === q.correctAnswer,
          explanation: q.explanation || null,
        })),
      };
      
      console.log("📤 Sending quiz progress to backend:");
      console.log(`   Endpoint: ${API_URL}/quiz-progress`);
      console.log(`   Reading Time (seconds): ${quizProgressData.reading_time_seconds}`);
      console.log(`   Audio Play Count: ${quizProgressData.audio_play_count}`);
      console.log(`   Learning Type: ${quizProgressData.learning_type}`);
      
      // Save detailed quiz progress
      const progressResponse = await fetch(`${API_URL}/quiz-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(quizProgressData),
      });
      
      if (!progressResponse.ok) {
        const errorData = await progressResponse.json().catch(() => ({}));
        console.error("❌ Failed to save detailed quiz progress:", errorData);
        // Continue even if detailed save fails - still try to log basic activity
      } else {
        const progressData = await progressResponse.json();
        console.log("✅ Quiz progress saved successfully!");
        console.log(`   Activity ID: ${progressData.activity?.id || 'N/A'}`);
        console.log(`   Saved Reading Time: ${progressData.activity?.reading_time || 'N/A'}s`);
        console.log(`   Saved Playback Time: ${progressData.activity?.playback_time || 'N/A'}`);
        console.log(`   Full Response:`, JSON.stringify(progressData, null, 2));
      }
      
      // Save engagement data to adaptivecontent table
      try {
        const engagementPayload = {
          subject,
          topic,
          learning_type: selectedType,
          audio_play_count: selectedType === "audio" ? audioPlayCount : 0,
          video_play_count: 0, // For future video implementation
          reading_time_seconds: selectedType === "text" ? finalReadingTime : 0,
          quiz_score: Math.round(score),
        };
        
        console.log("📤 Sending engagement data to backend:");
        console.log(`   Endpoint: ${API_URL}/adaptive-content`);
        console.log(`   Reading Time (seconds): ${engagementPayload.reading_time_seconds}`);
        console.log(`   Audio Play Count: ${engagementPayload.audio_play_count}`);
        
        const engagementResponse = await fetch(`${API_URL}/adaptive-content`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(engagementPayload),
        });
        
        if (!engagementResponse.ok) {
          const errorData = await engagementResponse.json().catch(() => ({}));
          console.error("❌ Failed to save engagement data:", errorData);
        } else {
          const engagementData = await engagementResponse.json();
          console.log("✅ Engagement data saved successfully!");
          console.log(`   Saved Reading Time: ${engagementData.data?.reading_time_seconds || 'N/A'}s`);
          console.log(`   Saved Audio Play Count: ${engagementData.data?.audio_play_count || 'N/A'}`);
          console.log(`   Confidence: ${engagementData.data?.confidence || 'N/A'}`);
        }
      } catch (engagementError) {
        console.error("❌ Failed to save engagement data (non-critical):", engagementError);
        // Don't block if engagement saving fails
      }
      
      // Note: Activity was already logged to activity_logs when user clicked "I'm Ready for Quiz"
      // The quiz-progress endpoint also saves to activity_logs with the quiz score
      // So we don't need to call /activity again here
      
      // Fetch ML recommendation after saving quiz progress
      setLoadingRecommendation(true);
      try {
        const recommendation = await getRecommendedMode(subject);
        setMlRecommendation(recommendation);
        console.log("ML Recommendation:", recommendation);
      } catch (mlError) {
        console.error("Failed to get ML recommendation:", mlError);
        // Don't block the UI if ML fails
      } finally {
        setLoadingRecommendation(false);
      }
    } catch (error) {
      console.error("Failed to save quiz progress:", error);
      // Don't block the UI if saving fails
    }
  };

  const handleRetry = () => {
    setSelectedType(null);
    setCurrentStep("selection");
    setQuiz(null);
    setQuizAnswers({});
    setQuizResults(null);
    setMlRecommendation(null);
  };

  const handleTryRecommendedMode = async (mode: string) => {
    // Reset and try the recommended learning type
    setSelectedType(mode);
    setCurrentStep("learning");
    setQuiz(null);
    setQuizAnswers({});
    setQuizResults(null);
    // Generate content for the recommended mode
    try {
      await generateForMode(subject, topic, mode as 'visual' | 'audio' | 'text', "medium");
    } catch (error) {
      console.error("Failed to generate content:", error);
    }
  };

  const handleContinue = () => {
    router.push({
      pathname: "/mode-switch",
      params: {
        subject,
        mode: selectedType,
      },
    });
  };

  // Selection Step
  if (currentStep === "selection") {
    return (
      <LinearGradient colors={["#EEF9FF", "#FDFEFE"]} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Learning Type Assessment</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Choose Your Learning Type</Text>
              <Text style={styles.cardSubtitle}>
                Select a learning style to test. You'll study content and take a quiz to see how well you perform with this style.
              </Text>

              <View style={styles.typesContainer}>
                {LEARNING_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeCard, selectedType === type.id && styles.typeCardSelected]}
                    onPress={() => handleSelectType(type.id)}
                  >
                    <View style={[styles.typeIconContainer, { backgroundColor: `${type.color}20` }]}>
                      <MaterialCommunityIcons name={type.icon as any} size={32} color={type.color} />
                    </View>
                    <Text style={styles.typeLabel}>{type.label}</Text>
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Quiz Loading Step
  if (quizLoading) {
    return (
      <LinearGradient colors={["#EEF9FF", "#FDFEFE"]} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingFullScreen}>
            <View style={styles.loadingCard}>
              <MaterialCommunityIcons name="book-open-variant" size={64} color="#0EA5E9" />
              <Text style={styles.loadingTitle}>Crafting Your Assessment</Text>
              <Text style={styles.loadingSubtitle}>
                We're preparing personalized quiz questions tailored to your {selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : ''} learning style. This will only take a moment...
              </Text>
              <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 32 }} />
              <View style={styles.loadingDots}>
                <Text style={styles.loadingDotText}>●</Text>
                <Text style={styles.loadingDotText}>●</Text>
                <Text style={styles.loadingDotText}>●</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Learning Step
  if (currentStep === "learning") {
    return (
      <LinearGradient colors={["#EEF9FF", "#FDFEFE"]} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep("selection")}>
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : ''} Learning
            </Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {contentLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0EA5E9" />
                <Text style={styles.loadingText}>Generating personalized content...</Text>
              </View>
            ) : content ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{content.title || topic}</Text>
                
                {/* Video Player - Show for visual and text content */}
                {(selectedType === "visual" || selectedType === "text") && (
                  <View style={styles.contentSection}>
                    <Text style={styles.sectionTitle}>Video Tutorial</Text>
                    {content.videoUrl ? (
                      VideoView ? (
                        <VideoPlayer
                          videoUrl={content.videoUrl}
                          label="Watch Video Tutorial"
                        />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <MaterialCommunityIcons name="video-off" size={32} color="#94A3B8" />
                          <Text style={styles.videoPlaceholderText}>Video player not available</Text>
                        </View>
                      )
                    ) : (
                      <View style={styles.videoPlaceholder}>
                        <MaterialCommunityIcons name="video" size={32} color="#94A3B8" />
                        <Text style={styles.videoPlaceholderText}>
                          Video tutorial will be generated automatically
                        </Text>
                        <Text style={[styles.videoPlaceholderText, { fontSize: 12, marginTop: 4, fontStyle: 'italic' }]}>
                          (Requires FFmpeg to be installed on the server)
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                
                {/* Visual Content */}
                {selectedType === "visual" && content.visualElements && (
                  <View>
                    {content.visualElements.map((element: any, index) => {
                      const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.100.66:4000";
                      const imageUrl = element.imageUrl 
                        ? (element.imageUrl.startsWith('http') 
                            ? element.imageUrl 
                            : `${API_URL}${element.imageUrl}`)
                        : null;
                      
                      return (
                        <View key={index} style={styles.contentSection}>
                          <Text style={styles.sectionTitle}>
                            {renderSafeContent(element.type || 'Visual Element')}
                          </Text>
                          
                          {/* Note: Images are generated programmatically when creating videos */}
                          {/* For now, show visual description - video will be shown above if available */}
                          <View style={styles.visualDescriptionBox}>
                            <MaterialCommunityIcons name="eye" size={24} color="#0EA5E9" />
                            <Text style={styles.visualDescriptionText}>
                              Visual content will be shown in the video tutorial above
                            </Text>
                          </View>
                          
                          {element.description && (
                            <Text style={styles.contentText}>
                              {renderSafeContent(element.description)}
                            </Text>
                          )}
                          
                          {element.content && (
                            <Text style={styles.contentText}>
                              {renderSafeContent(element.content)}
                            </Text>
                          )}
                          
                          {element.colorScheme && (
                            <View style={styles.colorSchemeContainer}>
                              <MaterialCommunityIcons name="palette" size={16} color="#64748B" />
                              <Text style={styles.colorSchemeText}>
                                Color Scheme: {renderSafeContent(element.colorScheme)}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                    {content.stepByStepGuide && (
                      <View style={styles.contentSection}>
                        <Text style={styles.sectionTitle}>Step-by-Step Guide</Text>
                        {content.stepByStepGuide.map((step, index) => (
                          <View key={index} style={styles.stepContainer}>
                            <Text style={styles.stepNumber}>Step {renderSafeContent(step.step)}</Text>
                            <Text style={styles.contentText}>{renderSafeContent(step.visualDescription)}</Text>
                            <Text style={styles.contentText}>{renderSafeContent(step.explanation)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {/* Summary for visual content */}
                    {content.summary && (
                      <View style={styles.contentSection}>
                        <Text style={styles.sectionTitle}>Summary</Text>
                        <Text style={styles.contentText}>{renderSafeContent(content.summary)}</Text>
                      </View>
                    )}
                    
                    {/* Related Video Links for visual */}
                    {content.relatedVideoLinks && content.relatedVideoLinks.length > 0 && (
                      <View style={styles.contentSection}>
                        <Text style={styles.sectionTitle}>📺 Related Video Resources</Text>
                        <Text style={[styles.contentText, { marginBottom: 12, fontSize: 14, color: '#64748B' }]}>
                          Check out these additional video tutorials to enhance your learning:
                        </Text>
                        {content.relatedVideoLinks.map((video, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.videoLinkCard}
                            onPress={() => {
                              if (video.url) {
                                Linking.openURL(video.url).catch(err => 
                                  console.error('Failed to open video URL:', err)
                                );
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.videoLinkContent}>
                              <MaterialCommunityIcons name="play-circle" size={24} color="#10B981" />
                              <View style={styles.videoLinkText}>
                                <Text style={styles.videoLinkTitle}>{renderSafeContent(video.title)}</Text>
                                {video.description && (
                                  <Text style={styles.videoLinkDescription}>
                                    {renderSafeContent(video.description)}
                                  </Text>
                                )}
                                <Text style={styles.videoLinkUrl} numberOfLines={1}>
                                  {video.url}
                                </Text>
                              </View>
                              <MaterialCommunityIcons name="open-in-new" size={20} color="#94A3B8" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Audio Content */}
                {selectedType === "audio" && content.mainContent && (
                  <View>
                    {/* Single combined audio player at the top */}
                    {content.audioFiles?.combined ? (
                      <View style={styles.contentSection}>
                        <AudioPlayer
                          audioUrl={content.audioFiles.combined}
                          label="Listen to Complete Audio Lesson"
                        />
                      </View>
                    ) : (
                      <View style={styles.contentSection}>
                        <View style={styles.audioPlaceholder}>
                          <MaterialCommunityIcons name="volume-off" size={20} color="#94A3B8" />
                          <Text style={styles.audioPlaceholderText}>Audio not available</Text>
                        </View>
                      </View>
                    )}
                    
                    {/* Text content below */}
                    {content.audioIntroduction && (
                      <View style={styles.contentSection}>
                        <Text style={styles.sectionTitle}>Introduction</Text>
                        <Text style={styles.contentText}>{renderSafeContent(content.audioIntroduction)}</Text>
                      </View>
                    )}
                    {content.mainContent.map((section, index) => (
                      <View key={index} style={styles.contentSection}>
                        <Text style={styles.sectionTitle}>{renderSafeContent(section.section)}</Text>
                        <Text style={styles.contentText}>{renderSafeContent(section.audioScript)}</Text>
                        {section.keyPoints && Array.isArray(section.keyPoints) && (
                          <View style={styles.keyPointsContainer}>
                            {section.keyPoints.map((point, i) => (
                              <Text key={i} style={styles.keyPoint}>• {renderSafeContent(point)}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                    {/* Summary */}
                    {content.audioSummary && (
                      <View style={styles.contentSection}>
                        <Text style={styles.sectionTitle}>Summary</Text>
                        <Text style={styles.contentText}>{renderSafeContent(content.audioSummary)}</Text>
                      </View>
                    )}
                    
                    {/* Related Video Links for audio */}
                    {content.relatedVideoLinks && content.relatedVideoLinks.length > 0 && (
                      <View style={styles.contentSection}>
                        <Text style={styles.sectionTitle}>📺 Related Video Resources</Text>
                        <Text style={[styles.contentText, { marginBottom: 12, fontSize: 14, color: '#64748B' }]}>
                          Check out these additional video tutorials to enhance your learning:
                        </Text>
                        {content.relatedVideoLinks.map((video, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.videoLinkCard}
                            onPress={() => {
                              if (video.url) {
                                Linking.openURL(video.url).catch(err => 
                                  console.error('Failed to open video URL:', err)
                                );
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.videoLinkContent}>
                              <MaterialCommunityIcons name="play-circle" size={24} color="#10B981" />
                              <View style={styles.videoLinkText}>
                                <Text style={styles.videoLinkTitle}>{renderSafeContent(video.title)}</Text>
                                {video.description && (
                                  <Text style={styles.videoLinkDescription}>
                                    {renderSafeContent(video.description)}
                                  </Text>
                                )}
                                <Text style={styles.videoLinkUrl} numberOfLines={1}>
                                  {video.url}
                                </Text>
                              </View>
                              <MaterialCommunityIcons name="open-in-new" size={20} color="#94A3B8" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Text Content */}
                {selectedType === "text" && content.sections && (
                  <View>
                    {content.sections.map((section, index) => (
                      <View key={index} style={styles.contentSection}>
                        <Text style={styles.sectionTitle}>{section.heading || `Section ${index + 1}`}</Text>
                        <Text style={styles.contentText}>{renderSafeContent(section.content)}</Text>
                        {section.keyConcepts && Array.isArray(section.keyConcepts) && (
                          <View style={styles.keyPointsContainer}>
                            {section.keyConcepts.map((concept, i) => (
                              <Text key={i} style={styles.keyPoint}>
                                • {renderSafeContent(concept)}
                              </Text>
                            ))}
                          </View>
                        )}
                        {section.examples && Array.isArray(section.examples) && section.examples.map((example, i) => (
                          <View key={i} style={styles.exampleContainer}>
                            <Text style={styles.exampleLabel}>Example:</Text>
                            <Text style={styles.contentText}>{renderSafeContent(example.example)}</Text>
                            <Text style={styles.contentText}>{renderSafeContent(example.explanation)}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {content.summary && (
                  <View style={styles.summaryContainer}>
                    <Text style={styles.sectionTitle}>Summary</Text>
                    <Text style={styles.contentText}>{renderSafeContent(content.summary)}</Text>
                  </View>
                )}

                {/* Related Video Links */}
                {content.relatedVideoLinks && content.relatedVideoLinks.length > 0 && (
                  <View style={styles.contentSection}>
                    <Text style={styles.sectionTitle}>📺 Related Video Resources</Text>
                    <Text style={[styles.contentText, { marginBottom: 12, fontSize: 14, color: '#64748B' }]}>
                      Check out these additional video tutorials to enhance your learning:
                    </Text>
                    {content.relatedVideoLinks.map((video, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.videoLinkCard}
                        onPress={() => {
                          if (video.url) {
                            Linking.openURL(video.url).catch(err => 
                              console.error('Failed to open video URL:', err)
                            );
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.videoLinkContent}>
                          <MaterialCommunityIcons name="play-circle" size={24} color="#10B981" />
                          <View style={styles.videoLinkText}>
                            <Text style={styles.videoLinkTitle}>{renderSafeContent(video.title)}</Text>
                            {video.description && (
                              <Text style={styles.videoLinkDescription}>
                                {renderSafeContent(video.description)}
                              </Text>
                            )}
                            <Text style={styles.videoLinkUrl} numberOfLines={1}>
                              {video.url}
                            </Text>
                          </View>
                          <MaterialCommunityIcons name="open-in-new" size={20} color="#94A3B8" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.primaryButton} 
                  onPress={() => {
                    console.log("🔘 Button pressed: I'm Ready for the Quiz");
                    handleStartQuiz().catch((error) => {
                      console.error("❌ Unhandled error in handleStartQuiz:", error);
                    });
                  }}
                >
                  <Text style={styles.primaryButtonText}>I'm Ready for the Quiz</Text>
                </TouchableOpacity>
              </View>
            ) : contentError ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>Failed to Generate Content</Text>
                <Text style={styles.errorText}>{contentError}</Text>
                <Text style={styles.errorHint}>
                  Common issues:{'\n'}
                  • Check your internet connection{'\n'}
                  • Verify server is running{'\n'}
                  • Ensure OpenAI API key is configured{'\n'}
                  • Make sure you're logged in
                </Text>
                <TouchableOpacity 
                  style={styles.primaryButton} 
                  onPress={() => handleSelectType(selectedType!)}
                >
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.secondaryButton} 
                  onPress={() => setCurrentStep("selection")}
                >
                  <Text style={styles.secondaryButtonText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No content available. Please try again.</Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep("selection")}>
                  <Text style={styles.secondaryButtonText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Quiz Step
  if (currentStep === "quiz" && quiz) {
    return (
      <LinearGradient colors={["#EEF9FF", "#FDFEFE"]} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep("learning")}>
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Quiz</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Test Your Understanding</Text>
              <Text style={styles.cardSubtitle}>
                Answer the questions to see how well you learned with {selectedType} learning style.
              </Text>

              {quiz.questions.map((question: any, index: number) => (
                <View key={question.id} style={styles.questionContainer}>
                  <Text style={styles.questionNumber}>Question {index + 1} of {quiz.questions.length}</Text>
                  <Text style={styles.questionText}>{question.question}</Text>
                  
                  {question.type === "multiple_choice" && question.options && (
                    <View style={styles.optionsContainer}>
                      {question.options.map((option: string, i: number) => (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.optionButton,
                            quizAnswers[question.id] === option && styles.optionButtonSelected
                          ]}
                          onPress={() => handleAnswerChange(question.id, option)}
                        >
                          <Text style={[
                            styles.optionText,
                            quizAnswers[question.id] === option && styles.optionTextSelected
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {question.type === "true_false" && (
                    <View style={styles.optionsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          quizAnswers[question.id] === "True" && styles.optionButtonSelected
                        ]}
                        onPress={() => handleAnswerChange(question.id, "True")}
                      >
                        <Text style={[
                          styles.optionText,
                          quizAnswers[question.id] === "True" && styles.optionTextSelected
                        ]}>
                          True
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          quizAnswers[question.id] === "False" && styles.optionButtonSelected
                        ]}
                        onPress={() => handleAnswerChange(question.id, "False")}
                      >
                        <Text style={[
                          styles.optionText,
                          quizAnswers[question.id] === "False" && styles.optionTextSelected
                        ]}>
                          False
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {(question.type === "short_answer" || (question.type !== "multiple_choice" && question.type !== "true_false" && (!question.options || question.options.length === 0))) && (
                    <View style={styles.textInputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Type your answer here..."
                        placeholderTextColor="#94A3B8"
                        value={quizAnswers[question.id] || ""}
                        onChangeText={(text) => handleAnswerChange(question.id, text)}
                        multiline={false}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  )}

                  {question.hint && (
                    <Text style={styles.hintText}>💡 Hint: {question.hint}</Text>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  Object.keys(quizAnswers).length !== quiz.questions.length && styles.primaryButtonDisabled
                ]}
                onPress={handleSubmitQuiz}
                disabled={Object.keys(quizAnswers).length !== quiz.questions.length}
              >
                <Text style={styles.primaryButtonText}>Submit Quiz</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Results Step
  if (currentStep === "results" && quizResults) {
    return (
      <LinearGradient colors={["#EEF9FF", "#FDFEFE"]} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleRetry}>
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Results</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <View style={styles.resultsHeader}>
                <MaterialCommunityIcons
                  name={quizResults.excels ? "check-circle" : "alert-circle"}
                  size={64}
                  color={quizResults.excels ? "#10B981" : "#F59E0B"}
                />
                <Text style={styles.resultsTitle}>
                  {quizResults.excels ? "Excellent!" : "Good Try!"}
                </Text>
                <Text style={styles.resultsScore}>Score: {Math.round(quizResults.score)}%</Text>
                <Text style={styles.resultsMessage}>
                  {quizResults.excels
                    ? `You excel with ${quizResults.learningType} learning! This learning style works well for you.`
                    : `You scored ${Math.round(quizResults.score)}% with ${quizResults.learningType} learning. Try another learning style to find your best match.`}
                </Text>
              </View>

              <View style={styles.resultsDetails}>
                <Text style={styles.sectionTitle}>Question Review</Text>
                {quizResults.results.map((result: any, index: number) => (
                  <View key={index} style={styles.resultItem}>
                    <View style={styles.resultHeader}>
                      <MaterialCommunityIcons
                        name={result.isCorrect ? "check" : "close"}
                        size={20}
                        color={result.isCorrect ? "#10B981" : "#EF4444"}
                      />
                      <Text style={styles.resultQuestion}>{result.question}</Text>
                    </View>
                    <Text style={styles.resultAnswer}>
                      Your answer: {result.userAnswer}
                    </Text>
                    {!result.isCorrect && (
                      <Text style={styles.resultCorrect}>
                        Correct answer: {result.correctAnswer}
                      </Text>
                    )}
                    <Text style={styles.resultExplanation}>{result.explanation}</Text>
                  </View>
                ))}
              </View>

              {/* ML Recommendation Section */}
              {mlRecommendation && (
                <View style={styles.recommendationContainer}>
                  <View style={styles.recommendationHeaderSection}>
                    <MaterialCommunityIcons name="brain" size={28} color="#0EA5E9" />
                    <Text style={styles.recommendationSectionTitle}>AI-Powered Recommendation</Text>
                  </View>
                  
                  <View style={styles.recommendationCard}>
                    {/* Recommended Mode Highlight */}
                    <View style={styles.recommendedModeBanner}>
                      <View style={styles.recommendedModeContent}>
                        <MaterialCommunityIcons 
                          name={LEARNING_TYPES.find(t => t.id === mlRecommendation.recommendedMode)?.icon as any || "brain"} 
                          size={32} 
                          color="#FFFFFF" 
                        />
                        <View style={styles.recommendedModeText}>
                          <Text style={styles.recommendedModeLabel}>Recommended</Text>
                          <Text style={styles.recommendedModeName}>
                            {mlRecommendation.recommendedMode.charAt(0).toUpperCase() + mlRecommendation.recommendedMode.slice(1)} Learning
                          </Text>
                        </View>
                      </View>
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceBadgeText}>
                          {Math.round(mlRecommendation.confidence * 100)}%
                        </Text>
                        <Text style={styles.confidenceLabel}>Confidence</Text>
                      </View>
                    </View>

                    {/* Reasoning */}
                    <View style={styles.reasoningContainer}>
                      <MaterialCommunityIcons name="lightbulb-on" size={20} color="#0EA5E9" />
                      <Text style={styles.reasoningText}>{mlRecommendation.reasoning}</Text>
                    </View>
                    
                    {/* Learning Types Comparison */}
                    <Text style={styles.comparisonTitle}>Performance Comparison</Text>
                    <View style={styles.learningTypesGrid}>
                      {LEARNING_TYPES.map((type) => {
                        const isRecommended = mlRecommendation.recommendedMode === type.id;
                        const isCurrent = selectedType === type.id;
                        const stats = mlRecommendation.modeStats?.[type.id as 'visual' | 'audio' | 'text'];
                        const avgScore = stats && stats.totalSessions > 0 
                          ? Math.round(stats.totalScore / stats.totalSessions) 
                          : 0;
                        const sessions = stats?.totalSessions || 0;
                        
                        return (
                          <TouchableOpacity
                            key={type.id}
                            style={[
                              styles.recommendedTypeCard,
                              isRecommended && styles.recommendedTypeCardHighlighted,
                              isCurrent && styles.recommendedTypeCardCurrent
                            ]}
                            onPress={() => handleTryRecommendedMode(type.id)}
                            activeOpacity={0.7}
                          >
                            <View style={[
                              styles.typeIconContainer, 
                              { 
                                backgroundColor: `${type.color}15`,
                                borderColor: isRecommended ? type.color : 'transparent',
                                borderWidth: isRecommended ? 2 : 0,
                              }
                            ]}>
                              <MaterialCommunityIcons name={type.icon as any} size={28} color={type.color} />
                            </View>
                            <Text style={styles.recommendedTypeLabel}>{type.label}</Text>
                            
                            {isRecommended && (
                              <View style={styles.recommendedBadge}>
                                <MaterialCommunityIcons name="star" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={styles.recommendedBadgeText}>Best</Text>
                              </View>
                            )}
                            
                            {isCurrent && !isRecommended && (
                              <View style={styles.currentBadge}>
                                <Text style={styles.currentBadgeText}>Current</Text>
                              </View>
                            )}
                            
                            {sessions > 0 ? (
                              <View style={styles.statsContainer}>
                                <View style={[styles.statRow, { marginBottom: 4 }]}>
                                  <Text style={styles.statLabel}>Avg Score</Text>
                                  <Text style={[styles.statValue, { color: type.color }]}>
                                    {avgScore}%
                                  </Text>
                                </View>
                                <View style={[styles.statRow, { marginBottom: 4 }]}>
                                  <Text style={styles.statLabel}>Sessions</Text>
                                  <Text style={styles.statValue}>{sessions}</Text>
                                </View>
                                {stats && stats.avgFocus > 0 && (
                                  <View style={styles.statRow}>
                                    <Text style={styles.statLabel}>Focus</Text>
                                    <Text style={styles.statValue}>{stats.avgFocus}%</Text>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <View style={styles.noDataContainer}>
                                <Text style={styles.noDataText}>No data yet</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}

              {loadingRecommendation && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#0EA5E9" />
                  <Text style={styles.loadingText}>Analyzing your performance...</Text>
                </View>
              )}

              <View style={styles.resultsActions}>
                {quizResults.excels ? (
                  <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
                    <Text style={styles.primaryButtonText}>Continue with {quizResults.learningType} Learning</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {mlRecommendation && mlRecommendation.recommendedMode !== selectedType && (
                      <TouchableOpacity 
                        style={styles.primaryButton} 
                        onPress={() => handleTryRecommendedMode(mlRecommendation.recommendedMode)}
                      >
                        <Text style={styles.primaryButtonText}>
                          Try {mlRecommendation.recommendedMode.charAt(0).toUpperCase() + mlRecommendation.recommendedMode.slice(1)} Learning (Recommended)
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.secondaryButton} onPress={handleRetry}>
                      <Text style={styles.secondaryButtonText}>Try Another Learning Type</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#38BDF8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  backButtonPlaceholder: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    padding: 28,
    shadowColor: "#BAE6FD",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  cardTitle: {
    fontSize: 26,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    marginBottom: 24,
    lineHeight: 20,
  },
  typesContainer: {
    gap: 16,
  },
  typeCard: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    padding: 20,
    alignItems: "center",
  },
  typeCardSelected: {
    borderColor: "#0EA5E9",
    backgroundColor: "#F0F9FF",
  },
  typeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginBottom: 8,
  },
  typeDescription: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
  },
  loadingFullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingCard: {
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    padding: 48,
    alignItems: "center",
    shadowColor: "#BAE6FD",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
    width: "100%",
    maxWidth: 400,
  },
  loadingTitle: {
    fontSize: 28,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 16,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  loadingDots: {
    flexDirection: "row",
    marginTop: 24,
    gap: 8,
  },
  loadingDotText: {
    fontSize: 12,
    color: "#0EA5E9",
    opacity: 0.6,
  },
  contentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginBottom: 12,
  },
  contentText: {
    fontSize: 15,
    fontFamily: "Roboto_400Regular",
    color: "#334155",
    lineHeight: 24,
    marginBottom: 12,
  },
  imageContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  visualImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#F8FAFC",
  },
  imagePlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
    marginLeft: 12,
  },
  colorSchemeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  colorSchemeText: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    marginLeft: 8,
  },
  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  audioPlayerLabel: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#10B981",
    marginLeft: 12,
    flex: 1,
  },
  audioPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  audioPlaceholderText: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
    marginLeft: 12,
  },
  stepContainer: {
    marginBottom: 16,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#0EA5E9",
  },
  stepNumber: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0EA5E9",
    marginBottom: 8,
  },
  keyPointsContainer: {
    marginTop: 12,
  },
  keyPoint: {
    fontSize: 15,
    fontFamily: "Roboto_400Regular",
    color: "#334155",
    marginBottom: 8,
    lineHeight: 22,
  },
  exampleContainer: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  exampleLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0EA5E9",
    marginBottom: 8,
  },
  summaryContainer: {
    backgroundColor: "#F0F9FF",
    padding: 20,
    borderRadius: 16,
    marginTop: 24,
  },
  questionContainer: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  questionNumber: {
    fontSize: 12,
    fontFamily: "Roboto_500Medium",
    color: "#64748B",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginBottom: 16,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  optionButtonSelected: {
    borderColor: "#0EA5E9",
    backgroundColor: "#F0F9FF",
  },
  optionText: {
    fontSize: 15,
    fontFamily: "Roboto_400Regular",
    color: "#334155",
  },
  optionTextSelected: {
    color: "#0EA5E9",
    fontFamily: "Roboto_500Medium",
  },
  hintText: {
    fontSize: 13,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    marginTop: 12,
    fontStyle: "italic",
  },
  textInputContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    padding: 16,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Roboto_400Regular",
    color: "#334155",
    minHeight: 50,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#10B981",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
  secondaryButton: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  errorContainer: {
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Roboto_400Regular",
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 24,
  },
  errorHint: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  resultsHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  resultsTitle: {
    fontSize: 28,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 8,
  },
  resultsScore: {
    fontSize: 48,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0EA5E9",
    marginBottom: 12,
  },
  resultsMessage: {
    fontSize: 16,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  resultsDetails: {
    marginTop: 24,
  },
  resultItem: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  resultQuestion: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#0F172A",
    flex: 1,
    marginLeft: 8,
    lineHeight: 22,
  },
  resultAnswer: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    marginTop: 8,
  },
  resultCorrect: {
    fontSize: 14,
    fontFamily: "Roboto_500Medium",
    color: "#10B981",
    marginTop: 4,
  },
  resultExplanation: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#334155",
    marginTop: 8,
    lineHeight: 20,
  },
  resultsActions: {
    marginTop: 24,
  },
  recommendationContainer: {
    marginTop: 32,
    marginBottom: 16,
  },
  recommendationHeaderSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  recommendationSectionTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginLeft: 12,
  },
  recommendationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  recommendedModeBanner: {
    backgroundColor: "#0EA5E9",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recommendedModeContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recommendedModeText: {
    marginLeft: 16,
  },
  recommendedModeLabel: {
    fontSize: 12,
    fontFamily: "Roboto_500Medium",
    color: "#BAE6FD",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recommendedModeName: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  confidenceBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
  },
  confidenceBadgeText: {
    fontSize: 24,
    fontFamily: "Montserrat_700Bold",
    color: "#FFFFFF",
  },
  confidenceLabel: {
    fontSize: 10,
    fontFamily: "Roboto_400Regular",
    color: "#BAE6FD",
    marginTop: 2,
  },
  reasoningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reasoningText: {
    fontSize: 15,
    fontFamily: "Roboto_400Regular",
    color: "#334155",
    lineHeight: 22,
    marginLeft: 12,
    flex: 1,
  },
  comparisonTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginBottom: 16,
  },
  learningTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6, // Negative margin to offset card margins
  },
  recommendedTypeCard: {
    flex: 1,
    minWidth: "30%",
    maxWidth: "32%",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    padding: 16,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 6, // Spacing between cards
    marginBottom: 12,
  },
  recommendedTypeCardHighlighted: {
    borderColor: "#0EA5E9",
    backgroundColor: "#F0F9FF",
    borderWidth: 3,
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  recommendedTypeCardCurrent: {
    borderColor: "#10B981",
    borderWidth: 2,
  },
  recommendedTypeLabel: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  recommendedBadge: {
    backgroundColor: "#0EA5E9",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
  currentBadge: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontFamily: "Roboto_500Medium",
    color: "#FFFFFF",
  },
  statsContainer: {
    width: "100%",
    marginTop: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  noDataContainer: {
    marginTop: 12,
    paddingVertical: 8,
  },
  noDataText: {
    fontSize: 11,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
    fontStyle: "italic",
  },
  videoContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  video: {
    width: "100%",
    height: 300,
    backgroundColor: "#000000",
  },
  videoLabel: {
    fontSize: 14,
    fontFamily: "Roboto_500Medium",
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },
  videoPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  videoPlaceholderText: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
    marginLeft: 12,
  },
  visualDescriptionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  visualDescriptionText: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#0EA5E9",
    marginLeft: 12,
    flex: 1,
  },
  videoLinkCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  videoLinkContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  videoLinkText: {
    flex: 1,
    marginLeft: 12,
  },
  videoLinkTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    marginBottom: 4,
  },
  videoLinkDescription: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    marginBottom: 6,
    lineHeight: 20,
  },
  videoLinkUrl: {
    fontSize: 12,
    fontFamily: "Roboto_400Regular",
    color: "#10B981",
    textDecorationLine: "underline",
  },
});

