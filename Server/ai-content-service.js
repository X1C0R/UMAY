/**
 * AI Content Generation Service for MINDMORPH
 * Generates personalized learning content based on ML-analyzed learning types
 */

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import fs from "fs";
import path from "path";
import { generateVideoFromText, setTTSFunction } from "./video-generation-service.js";

let supabaseClient = null;
let aiApiKey = null;
let aiProvider = null; // 'openai', 'anthropic', 'google', etc.
let googleAI = null; // Google Generative AI client

export function initializeAIServices(supabase, apiKey, provider = 'openai') {
  supabaseClient = supabase;
  aiApiKey = apiKey;
  aiProvider = provider;
  
  // Set TTS function for video generation service
  setTTSFunction(generateTTSAudioSimple);
  
  // Initialize Google Generative AI client if using Google provider
  if (provider === 'google' && apiKey) {
    try {
      googleAI = new GoogleGenAI({ apiKey: apiKey });
      console.log('✅ Google Generative AI SDK initialized');
    } catch (error) {
      console.error('Failed to initialize Google Generative AI SDK:', error);
      googleAI = null;
    }
  } else {
    googleAI = null;
  }
}

/**
 * Generate personalized content based on learning mode
 */
export async function generatePersonalizedContent(userId, subject, topic, learningMode, difficulty = 'medium') {
  try {
    // Get user's learning history for context
    const { data: activities } = await supabaseClient
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", subject)
      .order("session_date", { ascending: false })
      .limit(10);

    const userContext = buildUserContext(activities, learningMode);

    // Generate content based on learning mode
    switch (learningMode.toLowerCase()) {
      case 'visual':
        return await generateVisualContent(subject, topic, difficulty, userContext);
      case 'audio':
        return await generateAudioContent(subject, topic, difficulty, userContext);
      case 'text':
        return await generateTextContent(subject, topic, difficulty, userContext);
      default:
        return await generateMixedContent(subject, topic, difficulty, userContext);
    }
  } catch (error) {
    console.error("Error generating personalized content:", error);
    throw error;
  }
}

/**
 * Generate Visual Learning Content
 */
async function generateVisualContent(subject, topic, difficulty, userContext) {
  const prompt = `You are an expert educational content creator specializing in visual learning. 
Create engaging visual learning content for the following:

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
User Context: ${userContext}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. You MUST respond with ONLY valid, complete JSON. Do NOT use markdown code blocks (no \`\`\`json or \`\`\`).
2. Keep ALL content EXTREMELY CONCISE. Every text field must be SHORT.
3. Limit to 2 visual elements MAXIMUM
4. Each description: 1 sentence MAX (20-30 words MAX)
5. Each content: 2-3 sentences MAX (40-60 words MAX) - NOT a paragraph!
6. colorScheme: Simple description (e.g., "blue and green") - 5-10 words MAX
7. Do NOT truncate the response. The JSON must be complete and properly closed.
8. Start with { and end with }. Return ONLY the JSON object, nothing else.
9. Prioritize completeness over length - ensure the entire JSON fits within token limits.

Generate a concise visual learning module with this EXACT structure (keep all text fields VERY SHORT):
{
  "title": "Topic Title (5-8 words max)",
  "visualElements": [
    {
      "type": "diagram|chart|illustration|timeline",
      "description": "Brief description (1 sentence MAX, 20-30 words)",
      "content": "Brief content (2-3 sentences MAX, 40-60 words)",
      "colorScheme": "Simple color scheme (5-10 words MAX)"
    }
  ],
  "stepByStepGuide": [
    {
      "step": 1,
      "visualDescription": "What to visualize (1 sentence MAX, 15-20 words)",
      "explanation": "Explanation (1 sentence MAX, 15-20 words)"
    }
  ],
  "visualMnemonics": [
    {
      "concept": "Concept name (2-4 words)",
      "visualMnemonic": "Memory aid (1 sentence MAX, 15-20 words)"
    }
  ],
  "practiceProblems": [
    {
      "problem": "Problem (1 sentence MAX, 15-20 words)",
      "visualHint": "Hint (1 sentence MAX, 10-15 words)",
      "solution": "Solution (1 sentence MAX, 15-20 words)"
    }
  ],
  "summary": "Summary (2-3 sentences MAX, 40-60 words)",
  "relatedVideoLinks": [
    {
      "title": "Video title (5-10 words)",
      "url": "Full YouTube or educational video URL",
      "description": "Brief description (1 sentence MAX, 15-20 words)"
    }
  ]
}

CRITICAL: Keep EVERY text field SHORT. description and content must be 1-3 sentences MAX, not paragraphs!
IMPORTANT: For relatedVideoLinks, provide 2-3 relevant YouTube or educational video URLs that complement this topic. Use real, accessible video URLs.`;

  // First, generate the content structure with text descriptions
  const content = await callAI(prompt, {
    temperature: 0.7,
    max_tokens: 3000, // Increased for visual content (has more fields)
  });

  // Generate video from text content (optional - don't block if it fails)
  // Note: Video generation requires FFmpeg to be installed
  if (content && (content.visualElements || content.sections || content.title)) {
    try {
      console.log('🎬 Attempting to generate video tutorial from visual content...');
      console.log('   Note: This requires FFmpeg to be installed on the server');
      const videoUrl = await generateVideoFromText(content, subject, topic);
      if (videoUrl) {
        content.videoUrl = videoUrl;
        console.log(`✅ Video generated successfully: ${videoUrl}`);
      } else {
        console.warn('⚠️ Video generation returned no URL');
      }
    } catch (videoError) {
      // Check if it's an FFmpeg error
      if (videoError.message?.includes('FFmpeg is not installed')) {
        console.warn('⚠️ Video generation skipped: FFmpeg is not installed');
        console.warn('   Install FFmpeg to enable video generation: https://ffmpeg.org/download.html');
      } else {
        console.error('❌ Error generating video (continuing without video):', videoError.message);
      }
      console.log('   Content is still available without video');
      // Continue without video - visual content is still available
      // Don't set videoUrl so frontend won't try to display it
    }
  }
  
  console.log(`✅ Visual content generated with ${content.visualElements?.length || 0} visual element(s)`);
  
  return content;
}

/**
 * Generate Audio Learning Content
 * 
 * This function uses a two-step process:
 * 1. First, generates text content structure using regular text models (gemini-2.5-pro, etc.)
 * 2. Then, converts the generated text to audio files using simple TTS service (not Gemini TTS model)
 * 
 * Note: We use a simple TTS service (Google Translate TTS) instead of Gemini TTS to avoid
 * model overload issues (503 errors). This uses the generated text content directly.
 */
async function generateAudioContent(subject, topic, difficulty, userContext) {
  const prompt = `You are an expert educational content creator specializing in audio/auditory learning. 
Create engaging audio learning content for the following:

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
User Context: ${userContext}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. You MUST respond with ONLY valid, complete JSON. Do NOT use markdown code blocks (no \`\`\`json or \`\`\`).
2. Keep ALL content EXTREMELY CONCISE. Every text field must be SHORT.
3. audioScript: MAXIMUM 2 sentences (40-60 words). NO MORE!
4. audioIntroduction: 1 sentence only (20-30 words MAX)
5. audioSummary: 1 sentence only (20-30 words MAX)
6. verbalMnemonic: MAXIMUM 5-8 words. Keep it VERY SHORT!
7. Limit to 2 sections MAXIMUM
8. Each section audioScript: 2 sentences MAXIMUM (40-60 words)
9. Do NOT truncate the response. The JSON must be complete and properly closed.
10. Start with { and end with }. Return ONLY the JSON object, nothing else.
11. Prioritize completeness over length - ensure the entire JSON fits within token limits.

Generate a concise audio learning module with this EXACT structure (keep all text fields VERY SHORT):
{
  "title": "Topic Title (5-8 words max)",
  "audioIntroduction": "Brief introduction (1 sentence, 20-30 words MAX)",
  "mainContent": [
    {
      "section": "Section title (4-8 words)",
      "audioScript": "Brief explanation (2 sentences MAX, 40-60 words TOTAL)",
      "keyPoints": ["Point 1", "Point 2"],
      "verbalMnemonic": "Memory aid (5-8 words MAX)"
    }
  ],
  "audioSummary": "Brief summary (1 sentence, 20-30 words MAX)",
  "recapPoints": ["Key point 1", "Key point 2"],
  "relatedVideoLinks": [
    {
      "title": "Video title (5-10 words)",
      "url": "Full YouTube or educational video URL",
      "description": "Brief description (1 sentence MAX, 15-20 words)"
    }
  ]
}

CRITICAL: Keep EVERY text field SHORT. verbalMnemonic must be 5-8 words only. audioScript must be 2 sentences max.
IMPORTANT: For relatedVideoLinks, provide 2-3 relevant YouTube or educational video URLs that complement this topic. Use real, accessible video URLs.`;

  // First, generate the content structure
  // Increased tokens to ensure complete JSON responses (was 1200, but responses were still truncated)
  const content = await callAI(prompt, {
    temperature: 0.7,
    max_tokens: 2500, // Increased to prevent truncation
  });

  // Generate ONE combined audio file using simple TTS (uses generated text, not Gemini TTS model)
  // This avoids the Gemini TTS model overload issues (503 errors)
  if (content) {
    try {
      console.log('🎤 Generating combined TTS audio file from generated text content...');
      console.log('📝 Content keys:', Object.keys(content));
      console.log('📝 Has audioIntroduction:', !!content.audioIntroduction);
      console.log('📝 Has mainContent:', !!content.mainContent);
      console.log('📝 Has audioSummary:', !!content.audioSummary);
      
      // Combine all audio text into one script
      const audioScriptParts = [];
      
      // Add introduction
      if (content.audioIntroduction) {
        audioScriptParts.push(content.audioIntroduction);
      }
      
      // Add all sections
      if (content.mainContent && Array.isArray(content.mainContent)) {
        console.log(`📝 Found ${content.mainContent.length} sections in mainContent`);
        for (let i = 0; i < content.mainContent.length; i++) {
          const section = content.mainContent[i];
          if (section.audioScript) {
            audioScriptParts.push(section.audioScript);
          }
        }
      }
      
      // Add summary
      if (content.audioSummary) {
        audioScriptParts.push(content.audioSummary);
      }
      
      // Combine all parts with pauses
      const combinedScript = audioScriptParts.join('. ');
      console.log(`🎤 Combined audio script length: ${combinedScript.length} characters`);
      console.log(`🎤 Number of parts: ${audioScriptParts.length}`);
      
      if (combinedScript.trim().length > 0) {
        try {
          console.log('🎤 Generating combined audio file...');
          const combinedAudio = await generateTTSAudioSimple(combinedScript, { language: 'en' });
          console.log(`✅ Generated combined audio: ${combinedAudio.audioUrl}`);
          
          // Return single combined audio file
          const result = {
            ...content,
            audioFiles: {
              combined: combinedAudio.audioUrl
            }
          };
          
          console.log('✅ Returning content with combined audio file');
          return result;
        } catch (error) {
          console.error('❌ Failed to generate combined audio:', error.message);
          console.error('❌ Error stack:', error.stack);
          // Return content without audio if TTS fails
          return content;
        }
      } else {
        console.log('⚠️ No audio content to generate');
        return content;
      }
    } catch (error) {
      console.error('⚠️ TTS generation failed, returning text-only content:', error.message);
      // Return content without audio if TTS fails
      return content;
    }
  }

  // Return content as-is if not using Google or TTS fails
  return content;
}

/**
 * Generate Text-to-Speech Audio using Simple Text-to-Speech
 * Uses the generated text content and converts it to audio using a simpler, more reliable method
 * This avoids the Gemini TTS model which can be overloaded
 */
async function generateTTSAudioSimple(text, options = {}) {
  try {
    // Use a simple HTTP-based TTS service
    // Uses Google Translate TTS (free, no API key needed)
    // This uses the generated text content directly, avoiding Gemini TTS model overload issues
    const language = options.language || 'en';
    
    // Google Translate TTS has a ~200 character limit per request
    // Split longer texts into chunks
    const maxChunkLength = 180; // Slightly less to be safe
    const textChunks = [];
    
    if (text.length <= maxChunkLength) {
      textChunks.push(text);
    } else {
      // Split by sentences first, then by length
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxChunkLength) {
          currentChunk += sentence;
        } else {
          if (currentChunk) textChunks.push(currentChunk.trim());
          // If single sentence is too long, split by words
          if (sentence.length > maxChunkLength) {
            const words = sentence.split(' ');
            let wordChunk = '';
            for (const word of words) {
              if ((wordChunk + ' ' + word).length <= maxChunkLength) {
                wordChunk = wordChunk ? wordChunk + ' ' + word : word;
              } else {
                if (wordChunk) textChunks.push(wordChunk);
                wordChunk = word;
              }
            }
            if (wordChunk) currentChunk = wordChunk;
          } else {
            currentChunk = sentence;
          }
        }
      }
      if (currentChunk) textChunks.push(currentChunk.trim());
    }
    
    console.log(`🎤 Generating TTS audio using simple TTS service (text length: ${text.length}, chunks: ${textChunks.length})...`);
    
    // Fetch audio for each chunk and combine
    const audioBuffers = [];
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      const textEncoded = encodeURIComponent(chunk);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${textEncoded}&tl=${language}&client=tw-ob`;
      
      try {
        console.log(`📡 Fetching audio chunk ${i + 1}/${textChunks.length} (${chunk.length} chars)...`);
        const response = await fetch(ttsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        console.log(`📡 Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.error(`❌ TTS service error for chunk ${i + 1}:`, errorText.substring(0, 200));
          throw new Error(`TTS service returned ${response.status} for chunk ${i + 1}: ${errorText.substring(0, 100)}`);
        }
        
        const chunkBuffer = Buffer.from(await response.arrayBuffer());
        console.log(`✅ Received audio chunk ${i + 1} (${chunkBuffer.length} bytes)`);
        audioBuffers.push(chunkBuffer);
        
        // Small delay between requests to avoid rate limiting
        if (i < textChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`❌ Failed to generate audio for chunk ${i + 1}:`, error.message);
        console.error('❌ Error details:', error);
        // Continue with other chunks even if one fails
      }
    }
    
    if (audioBuffers.length === 0) {
      console.error('❌ Failed to generate any audio chunks');
      throw new Error('Failed to generate any audio chunks - all requests failed');
    }
    
    console.log(`✅ Successfully generated ${audioBuffers.length}/${textChunks.length} audio chunks`);
    
    // Combine all audio chunks
    const combinedAudio = Buffer.concat(audioBuffers);
    
    // Save audio file
    const uploadsDir = path.join(process.cwd(), 'uploads', 'audio');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, combinedAudio);
    
    // Return audio URL and metadata
    const audioUrl = `/uploads/audio/${fileName}`;
    
    console.log(`✅ Generated audio file: ${audioUrl} (${audioBuffers.length} chunks combined)`);
    
    return {
      audioUrl,
      filePath,
      mimeType: 'audio/mpeg',
      textContent: text,
      duration: null,
    };
  } catch (error) {
    console.error('Simple TTS generation failed:', error);
    throw new Error(`Failed to generate TTS audio: ${error.message}`);
  }
}

/**
 * Generate Text-to-Speech Audio using Gemini TTS
 * Converts text to audio files for audio learning type
 * NOTE: This uses the Gemini TTS model which can be overloaded (503 errors)
 */
/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMsg = error.message || String(error);
      
      // Check if it's a retryable error (503, 429, or overloaded)
      const isRetryable = 
        errorMsg.includes('503') ||
        errorMsg.includes('overloaded') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('429') ||
        errorMsg.includes('rate limit') ||
        errorMsg.includes('quota');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⚠️ TTS attempt ${attempt + 1} failed (${errorMsg.substring(0, 100)}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export async function generateTTSAudio(text, options = {}) {
  // Validate API key and SDK client
  if (!googleAI) {
    if (!aiApiKey || !aiApiKey.startsWith('AIza')) {
      throw new Error('Invalid Google Gemini API key format. Key should start with "AIza". Please check your GOOGLE_AI_API_KEY in .env file.');
    }
    googleAI = new GoogleGenAI({ apiKey: aiApiKey });
  }

  // Use retry logic for TTS generation
  return await retryWithBackoff(async () => {
    // NOTE: This is a specialized TTS (Text-to-Speech) model, different from text generation models
    // TTS models can generate audio output, while regular models (gemini-2.5-pro, etc.) only generate text
    const model = 'gemini-2.5-pro-preview-tts';
    
    const config = {
      temperature: options.temperature || 1,
      responseModalities: ['audio'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: 'Speaker 1',
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: options.voiceName || 'Zephyr' // Default to Zephyr, can be: Zephyr, Puck, Charon, Fenrir, Kore
                }
              }
            }
          ]
        }
      }
    };

    const contents = [{
      role: 'user',
      parts: [{
        text: text,
      }],
    }];

    console.log(`🎤 Generating TTS audio with voice: ${config.speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs[0].voiceConfig.prebuiltVoiceConfig.voiceName}`);

    const response = await googleAI.models.generateContentStream({
      model,
      config,
      contents,
    });

    const audioChunks = [];
    let textContent = '';

    // Collect audio chunks and text
    for await (const chunk of response) {
      if (!chunk.candidates || !chunk.candidates[0]?.content?.parts) {
        continue;
      }

      const part = chunk.candidates[0].content.parts[0];

      // Handle audio data
      if (part.inlineData) {
        audioChunks.push({
          mimeType: part.inlineData.mimeType || 'audio/wav',
          data: part.inlineData.data || '',
        });
      }

      // Handle text content
      if (part.text) {
        textContent += part.text;
      }
    }

    if (audioChunks.length === 0) {
      throw new Error('No audio data received from TTS model');
    }

    // Combine all audio chunks
    const combinedAudio = {
      mimeType: audioChunks[0].mimeType,
      data: audioChunks.map(chunk => chunk.data).join(''),
    };

    // Convert to buffer
    let audioBuffer = Buffer.from(combinedAudio.data, 'base64');
    
    // If not WAV, convert it
    let fileExtension = mime.getExtension(combinedAudio.mimeType || '');
    if (!fileExtension || !combinedAudio.mimeType.includes('wav')) {
      fileExtension = 'wav';
      audioBuffer = convertToWav(combinedAudio.data, combinedAudio.mimeType);
    }

    // Save audio file
    const uploadsDir = path.join(process.cwd(), 'uploads', 'audio');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, audioBuffer);

    // Return audio URL and metadata
    const audioUrl = `/uploads/audio/${fileName}`;
    
    return {
      audioUrl,
      filePath,
      mimeType: `audio/${fileExtension}`,
      textContent: textContent || text,
      duration: null, // Could calculate from audio buffer if needed
    };
  }, 3, 2000); // 3 retries, 2 second initial delay
}

/**
 * Helper function to convert audio to WAV format
 */
function convertToWav(rawData, mimeType) {
  const options = parseMimeType(mimeType);
  const wavHeader = createWavHeader(
    Buffer.from(rawData, 'base64').length,
    options
  );
  const buffer = Buffer.from(rawData, 'base64');
  return Buffer.concat([wavHeader, buffer]);
}

/**
 * Parse MIME type to extract audio format options
 */
function parseMimeType(mimeType) {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options = {
    numChannels: 1,
    sampleRate: 24000, // Default sample rate
    bitsPerSample: 16, // Default bits per sample
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options;
}

/**
 * Create WAV file header
 */
function createWavHeader(dataLength, options) {
  const { numChannels, sampleRate, bitsPerSample } = options;

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0); // ChunkID
  buffer.writeUInt32LE(36 + dataLength, 4); // ChunkSize
  buffer.write('WAVE', 8); // Format
  buffer.write('fmt ', 12); // Subchunk1ID
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
  buffer.write('data', 36); // Subchunk2ID
  buffer.writeUInt32LE(dataLength, 40); // Subchunk2Size

  return buffer;
}

/**
 * Generate Text/Reading Learning Content
 */
async function generateTextContent(subject, topic, difficulty, userContext) {
  const prompt = `You are an expert educational content creator specializing in text-based/reading learning. 
Create comprehensive written learning content for the following:

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
User Context: ${userContext}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. You MUST respond with ONLY valid, complete JSON. Do NOT use markdown code blocks (no \`\`\`json or \`\`\`).
2. Keep ALL content EXTREMELY CONCISE. Every text field must be SHORT.
3. Limit to 2 sections MAXIMUM (not 2-3)
4. Each section content: 1 paragraph MAXIMUM (100-150 words MAX)
5. Introduction: 2 sentences MAX (30-40 words)
6. Each example: 1-2 sentences MAX
7. Case studies: 1 sentence description, 1 sentence analysis MAX
8. Practice problems: Brief problem statement (1 sentence)
9. Summary: 1 paragraph MAX (50-80 words)
10. Do NOT truncate the response. The JSON must be complete and properly closed.
11. Start with { and end with }. Return ONLY the JSON object, nothing else.
12. Prioritize completeness over length - ensure the entire JSON fits within token limits.

Generate a concise text-based learning module with this EXACT structure (keep all text fields VERY SHORT):
{
  "title": "Topic Title (5-8 words max)",
  "introduction": "Brief introduction (2 sentences MAX, 30-40 words)",
  "sections": [
    {
      "heading": "Section heading (4-8 words)",
      "content": "VERY concise content (1 paragraph MAX, 100-150 words)",
      "keyConcepts": ["Concept 1", "Concept 2", "Concept 3"],
      "examples": [
        {
          "example": "Brief example (1-2 sentences MAX)",
          "explanation": "Concise explanation (1 sentence MAX)"
        }
      ]
    }
  ],
  "caseStudies": [
    {
      "title": "Case study title (5-8 words)",
      "description": "Brief description (1 sentence MAX)",
      "analysis": "Concise analysis (1 sentence MAX)"
    }
  ],
  "practiceProblems": [
    {
      "problem": "Brief problem (1 sentence MAX)",
      "hint": "Brief hint (1 sentence MAX)",
      "solution": "Concise solution (1-2 sentences MAX)",
      "explanation": "Brief explanation (1 sentence MAX)"
    }
  ],
  "readingComprehension": [
    {
      "passage": "Short passage (2-3 sentences MAX, 50-80 words)",
      "questions": [
        {
          "question": "Comprehension question (1 sentence)",
          "answer": "Brief answer (1 sentence)"
        }
      ]
    }
  ],
  "summary": "Brief summary (1 paragraph MAX, 50-80 words)",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "furtherReading": ["Reading 1", "Reading 2"],
  "relatedVideoLinks": [
    {
      "title": "Video title (5-10 words)",
      "url": "Full YouTube or educational video URL",
      "description": "Brief description (1 sentence MAX, 15-20 words)"
    }
  ]
}

CRITICAL: Keep EVERY text field SHORT. content must be 1 paragraph max. introduction must be 2 sentences max.
IMPORTANT: For relatedVideoLinks, provide 2-3 relevant YouTube or educational video URLs that complement this topic. Use real, accessible video URLs.`;

  const content = await callAI(prompt, {
    temperature: 0.7,
    max_tokens: 4000, // Increased for text content (has more fields: sections, caseStudies, practiceProblems, etc.)
  });

  // Generate video from text content (optional - don't block if it fails)
  // Note: Video generation requires FFmpeg to be installed
  if (content && (content.sections || content.title)) {
    try {
      console.log('🎬 Attempting to generate video tutorial from text content...');
      console.log('   Note: This requires FFmpeg to be installed on the server');
      const videoUrl = await generateVideoFromText(content, subject, topic);
      if (videoUrl) {
        content.videoUrl = videoUrl;
        console.log(`✅ Video generated successfully: ${videoUrl}`);
      } else {
        console.warn('⚠️ Video generation returned no URL');
      }
    } catch (videoError) {
      // Check if it's an FFmpeg error
      if (videoError.message?.includes('FFmpeg is not installed')) {
        console.warn('⚠️ Video generation skipped: FFmpeg is not installed');
        console.warn('   Install FFmpeg to enable video generation: https://ffmpeg.org/download.html');
      } else {
        console.error('❌ Error generating video (continuing without video):', videoError.message);
      }
      console.log('   Content is still available without video');
      // Continue without video - text content is still available
      // Don't set videoUrl so frontend won't try to display it
    }
  }

  return content;
}

/**
 * Generate Mixed/Adaptive Content
 */
async function generateMixedContent(subject, topic, difficulty, userContext) {
  const prompt = `You are an expert educational content creator. 
Create comprehensive multi-modal learning content for the following:

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
User Context: ${userContext}

CRITICAL: Generate VERY CONCISE and SUMMARIZED content. Keep responses SHORT but INFORMATIVE. 
- Limit to 2-3 sections MAXIMUM
- Each section: 1-2 paragraphs MAXIMUM (not 2-3)
- Introduction: 2-3 sentences only
- Examples: 1-2 examples per section, keep brief
- Summary: 1-2 paragraphs only
Prioritize completeness over length. The ENTIRE JSON must fit within 6000 tokens and be complete.

Generate a comprehensive learning module that combines visual, audio, and text elements:
1. Multi-modal explanations
2. Various content formats
3. Interactive elements
4. Practice problems in multiple formats
5. Comprehensive summaries

Format the response as JSON with a structure that includes visual, audio, and text elements.`;

  return await callAI(prompt, {
    temperature: 0.7,
    max_tokens: 2500,
  });
}

/**
 * Generate Quiz Questions based on learning mode
 */
export async function generateQuizQuestions(subject, topic, learningMode, difficulty, numQuestions = 5) {
  const modeSpecificInstructions = {
    visual: "Include questions that can be answered using diagrams, charts, or visual reasoning. Provide visual hints.",
    audio: "Include questions that can be discussed verbally. Provide audio/verbal hints.",
    text: "Include reading comprehension and written reasoning questions. Provide detailed explanations.",
  };

  const prompt = `Generate ${numQuestions} quiz questions for:

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
Learning Mode: ${learningMode}
${modeSpecificInstructions[learningMode.toLowerCase()] || ""}

Format as JSON:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "type": "multiple_choice|true_false|short_answer",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Correct answer",
      "explanation": "Detailed explanation",
      "hint": "Mode-specific hint",
      "points": 10
    }
  ],
  "totalPoints": ${numQuestions * 10}
}`;

  return await callAI(prompt, {
    temperature: 0.8,
    max_tokens: 8000, // Increased for quiz questions with explanations
  });
}

/**
 * Generate Study Summary based on learning mode
 */
export async function generateStudySummary(userId, subject, learningMode) {
  try {
    // Get recent activities
    const { data: activities } = await supabaseClient
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", subject)
      .order("session_date", { ascending: false })
      .limit(20);

    const topics = [...new Set(activities.map(a => a.topic || subject))];
    const avgScore = activities
      .filter(a => a.quiz_score)
      .reduce((sum, a) => sum + a.quiz_score, 0) / activities.filter(a => a.quiz_score).length || 0;

    const prompt = `Create a personalized study summary for a student learning ${subject}.

Recent Topics Covered: ${topics.join(", ")}
Average Performance: ${Math.round(avgScore)}%
Learning Mode: ${learningMode}

Generate a ${learningMode}-friendly summary that includes:
1. Key concepts learned
2. Strengths and areas for improvement
3. Recommended next steps
4. Mode-specific study tips

Format as JSON with appropriate structure for ${learningMode} learning.`;

    return await callAI(prompt, {
      temperature: 0.7,
      max_tokens: 1000,
    });
  } catch (error) {
    console.error("Error generating study summary:", error);
    throw error;
  }
}

/**
 * Generate Explanations for Wrong Answers
 */
export async function generateExplanation(question, userAnswer, correctAnswer, learningMode, subject) {
  const prompt = `A student answered a question incorrectly. Provide a helpful explanation.

Subject: ${subject}
Question: ${question}
Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}
Learning Mode: ${learningMode}

Generate a ${learningMode}-friendly explanation that:
1. Acknowledges what the student got right (if anything)
2. Explains why their answer was incorrect
3. Provides the correct answer with clear reasoning
4. Uses ${learningMode}-appropriate teaching methods
5. Suggests how to avoid this mistake

Format as JSON:
{
  "acknowledgment": "What they got right",
  "explanation": "Clear explanation of the mistake",
  "correctAnswerExplanation": "Why the correct answer is right",
  "learningTip": "Mode-specific tip to remember this",
  "relatedConcepts": ["Related concept 1", "Related concept 2"]
}`;

  return await callAI(prompt, {
    temperature: 0.6,
    max_tokens: 800,
  });
}

/**
 * Build user context from activities
 */
function buildUserContext(activities, learningMode) {
  if (!activities || activities.length === 0) {
    return `New learner, prefers ${learningMode} learning mode`;
  }

  const avgScore = activities
    .filter(a => a.quiz_score)
    .reduce((sum, a) => sum + a.quiz_score, 0) / activities.filter(a => a.quiz_score).length || 0;
  
  const avgFocus = activities
    .filter(a => a.focus_level)
    .reduce((sum, a) => sum + a.focus_level, 0) / activities.filter(a => a.focus_level).length || 0;

  return `Experienced learner with ${activities.length} sessions, average score: ${Math.round(avgScore)}%, average focus: ${Math.round(avgFocus)}%, prefers ${learningMode} learning mode`;
}

/**
 * Call AI API (OpenAI, Anthropic, Google, etc.)
 */
async function callAI(prompt, options = {}) {
  // Ollama doesn't need an API key (runs locally)
  if (aiProvider !== 'ollama' && !aiApiKey) {
    throw new Error("AI API key not configured");
  }

  switch (aiProvider) {
    case 'openai':
      return await callOpenAI(prompt, options);
    case 'anthropic':
      return await callAnthropic(prompt, options);
    case 'google':
      return await callGoogleAI(prompt, options);
    case 'ollama':
      return await callOllama(prompt, options);
    default:
      return await callOpenAI(prompt, options);
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt, options = {}) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini', // Use gpt-4o-mini for cost efficiency, or gpt-4 for better quality
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Always respond with valid JSON only, no markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
        response_format: { type: "json_object" }, // Force JSON response
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    try {
      return JSON.parse(content);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(prompt, options = {}) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-haiku-20240307',
        max_tokens: options.max_tokens || 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: 'You are an expert educational content creator. Always respond with valid JSON only, no markdown formatting.',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (error) {
    console.error('Anthropic API call failed:', error);
    throw error;
  }
}

/**
 * Call Google Gemini API using official SDK
 */
async function callGoogleAI(prompt, options = {}) {
  // Validate API key and SDK client
  if (!googleAI) {
    if (!aiApiKey || !aiApiKey.startsWith('AIza')) {
      throw new Error('Invalid Google Gemini API key format. Key should start with "AIza". Please check your GOOGLE_AI_API_KEY in .env file.');
    }
    // Initialize if not already done
    googleAI = new GoogleGenAI({ apiKey: aiApiKey });
  }
  
  // Determine which model to use
  // NOTE: These are TEXT generation models (for visual, text, and audio learning content structure)
  // For TTS audio generation, use 'gemini-2.5-pro-preview-tts' in generateTTSAudio() function
  const requestedModel = options.model || process.env.GEMINI_MODEL;
  const modelsToTry = requestedModel 
    ? [requestedModel]
    : [
        'gemini-2.5-pro',                 // Gemini 2.5 Pro - Latest with thinking capabilities
        'gemini-2.0-flash-exp',           // Gemini 2.0 - Experimental
        'gemini-2.0-flash-thinking-exp',   // Gemini 2.0 with reasoning
        'gemini-1.5-flash',                // Stable, fast
        'gemini-1.5-pro',                  // Stable, better quality
        'gemini-pro',                      // Fallback
      ];
  
  const errors = [];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying Google Gemini model: ${modelName}`);
      
      // Check if model supports thinking capabilities
      const supportsThinking = modelName.includes('thinking') || modelName.includes('2.5-pro');
      
      // Enhanced prompt to ensure JSON response
      const enhancedPrompt = prompt + '\n\nCRITICAL INSTRUCTIONS:\n1. You MUST respond with ONLY valid, complete JSON. Do NOT use markdown code blocks (no ```json or ```).\n2. Keep ALL content CONCISE and SUMMARIZED. Limit text to 2-3 paragraphs per section maximum.\n3. Do NOT truncate the response. The JSON must be complete and properly closed.\n4. Start with { and end with }. Return ONLY the JSON object, nothing else.\n5. Prioritize completeness over length - ensure the entire JSON fits within token limits.';
      
      // Build config with thinking support
      const config = {
        thinkingConfig: supportsThinking ? {
          thinkingBudget: options.thinkingBudget !== undefined ? options.thinkingBudget : -1, // -1 = unlimited thinking
        } : undefined,
        imageConfig: {
          imageSize: '1K',
        },
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.max_tokens || 3500, // Limited to prevent truncation - prioritize complete JSON
        responseMimeType: 'application/json', // Request JSON response
      };
      
      // Remove undefined properties
      if (!config.thinkingConfig) {
        delete config.thinkingConfig;
      }
      
      // Build contents array
      const contents = [{
        role: 'user',
        parts: [{
          text: enhancedPrompt,
        }],
      }];
      
      // Try non-streaming first (more reliable for JSON)
      let content = '';
      let finishReason = null; // Track finish reason for truncation detection
      try {
        // Use generateContent (non-streaming) for more reliable JSON parsing
        const response = await googleAI.models.generateContent({
          model: modelName,
          config: config,
          contents: contents,
        });
        
        // Log finish reason to understand why response might be truncated
        if (response.candidates?.[0]?.finishReason) {
          finishReason = response.candidates[0].finishReason;
          console.log(`📊 Finish reason: ${finishReason}`);
          if (finishReason !== 'STOP') {
            console.warn(`⚠️ Response finished with reason: ${finishReason} (not STOP - might be truncated)`);
          }
        }
        
        // Extract text from response
        if (response.text) {
          content = response.text;
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          content = response.candidates[0].content.parts[0].text;
        } else if (typeof response === 'string') {
          content = response;
        } else {
          // Fallback to streaming if non-streaming doesn't work
          console.log('Non-streaming response format unexpected, trying streaming...');
          const streamResponse = await googleAI.models.generateContentStream({
            model: modelName,
            config: config,
            contents: contents,
          });
          
          // Collect all text chunks from stream
          for await (const chunk of streamResponse) {
            // Handle different chunk formats
            if (typeof chunk === 'string') {
              content += chunk;
            } else if (chunk.text) {
              content += chunk.text;
            } else if (chunk.content) {
              content += chunk.content;
            } else if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
              content += chunk.candidates[0].content.parts[0].text;
            } else {
              // Log unexpected format for debugging
              console.log('Unexpected chunk format:', JSON.stringify(chunk).substring(0, 200));
            }
          }
        }
      } catch (streamError) {
        // If generateContent doesn't exist, try generateContentStream
        console.log('generateContent failed, trying generateContentStream...');
        const streamResponse = await googleAI.models.generateContentStream({
          model: modelName,
          config: config,
          contents: contents,
        });
        
        // Collect all text chunks from stream
        for await (const chunk of streamResponse) {
          if (typeof chunk === 'string') {
            content += chunk;
          } else if (chunk.text) {
            content += chunk.text;
          } else if (chunk.content) {
            content += chunk.content;
          } else if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
            content += chunk.candidates[0].content.parts[0].text;
          }
        }
      }
      
      if (!content) {
        throw new Error('Empty response from Google AI');
      }
      
      console.log(`✅ Successfully used ${modelName}`);
      console.log(`📝 Response length: ${content.length} characters`);
      console.log(`📝 First 200 chars: ${content.substring(0, 200)}`);
      
      // Check if response was truncated due to MAX_TOKENS
      if (finishReason === 'MAX_TOKENS' || finishReason === 'OTHER') {
        // Check if response looks like it was truncated (doesn't start with { or [)
        const trimmedContent = content.trim();
        if (!trimmedContent.startsWith('{') && !trimmedContent.startsWith('[')) {
          throw new Error(
            `Response was truncated due to token limit (${options.max_tokens || 3500} tokens). ` +
            `The model returned: "${content.substring(0, 100)}..." ` +
            `Please increase max_tokens or reduce the complexity of the request.`
          );
        }
      }
      
      // Check if response is suspiciously short (likely truncated)
      if (content.length < 500 && options.max_tokens > 1000) {
        console.warn(`⚠️ Response is very short (${content.length} chars) but max_tokens is ${options.max_tokens}. This might indicate truncation or model issue.`);
        // If it doesn't look like JSON at all, throw an error
        const trimmedContent = content.trim();
        if (!trimmedContent.startsWith('{') && !trimmedContent.startsWith('[') && !trimmedContent.includes('{')) {
          throw new Error(
            `Response appears to be truncated or invalid. Got: "${content.substring(0, 200)}". ` +
            `Expected JSON but received text. This may indicate the response was cut off due to token limits.`
          );
        }
      }
      
      // Helper function to repair incomplete JSON
      const repairIncompleteJSON = (jsonStr) => {
        let repaired = jsonStr.trim();
        
        // If it doesn't start with {, find the first {
        const firstBrace = repaired.indexOf('{');
        if (firstBrace > 0) {
          repaired = repaired.substring(firstBrace);
        }
        
        // FIRST: Fix any unterminated strings at the end (this is critical for quiz and content fields)
        // This must happen early before other repairs
        const truncatableFields = [
          // Quiz fields
          'hint', 'explanation', 'question', 'correctAnswer',
          // Audio fields
          'verbalMnemonic', 'audioScript', 'audioIntroduction', 'audioSummary',
          // Text content fields
          'content', 'description', 'introduction', 'title', 'heading',
          'example', 'analysis', 'problem', 'solution', 'passage', 'summary'
        ];
        
        // Fix unterminated strings in known fields
        for (const field of truncatableFields) {
          // Pattern matches: "fieldName": "text without closing quote at end
          const pattern = new RegExp(`"${field}"\\s*:\\s*"([^"]*?)(?:"|\\s*[,\\}])?$`, 'm');
          const match = repaired.match(pattern);
          if (match && match.index !== undefined) {
            // Check if this is at the very end (unterminated)
            const matchEnd = match.index + match[0].length;
            if (matchEnd >= repaired.length - 5) {
              // This field is unterminated - close it properly
              const value = match[1] || '';
              const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
              repaired = repaired.substring(0, match.index) + 
                        `"${field}": "${escapedValue}"` + 
                        repaired.substring(matchEnd);
              console.log(`🔧 Fixed unterminated ${field} field early`);
            }
          }
        }
        
        // Also fix any generic unterminated string at the end
        const lastUnterminated = repaired.match(/":\s*"([^"]*?)$/);
        if (lastUnterminated && lastUnterminated.index !== undefined) {
          const value = lastUnterminated[1] || '';
          const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          repaired = repaired.substring(0, lastUnterminated.index) + 
                    `": "${escapedValue}"` + 
                    repaired.substring(lastUnterminated.index + lastUnterminated[0].length);
          console.log('🔧 Fixed generic unterminated string at end early');
        }
        
        // Fix case where a new field starts with just a quote and nothing else (truncated field start)
        // Pattern: ...", "  or  ...",\n      "
        const truncatedFieldStart = repaired.match(/",\s*"$/) || repaired.match(/",\s*\n\s*"$/);
        if (truncatedFieldStart && truncatedFieldStart.index !== undefined) {
          // Remove the incomplete field start - just close the previous field properly
          repaired = repaired.substring(0, truncatedFieldStart.index + 1); // Keep the comma or newline before
          console.log('🔧 Removed truncated field start at end');
        }
        
        // Fix case where there's just a quote at the end (incomplete field)
        // This handles: ...",\n      "  (new field started but truncated)
        const trimmed = repaired.trim();
        if (trimmed.endsWith('"') && !trimmed.endsWith('\\"')) {
          // Check if this is a standalone quote (not part of a complete string)
          const lastQuoteIndex = repaired.lastIndexOf('"');
          const beforeQuote = repaired.substring(0, lastQuoteIndex).trim();
          // If the quote is preceded by comma, colon, or whitespace/newline, it's likely an incomplete field
          if (beforeQuote.endsWith(',') || beforeQuote.endsWith(':') || beforeQuote.match(/[\s\n]+$/)) {
            // Remove the incomplete quote and any trailing whitespace/comma
            let removeFrom = lastQuoteIndex;
            // Also remove trailing comma if present
            const beforeTrimmed = repaired.substring(0, removeFrom).trim();
            if (beforeTrimmed.endsWith(',')) {
              removeFrom = beforeTrimmed.lastIndexOf(',');
            }
            repaired = repaired.substring(0, removeFrom);
            console.log('🔧 Removed incomplete field quote at end');
          }
        }
        
        // Track state while parsing
        let insideString = false;
        let escapeNext = false;
        let depth = 0; // Track object/array depth
        let lastValidPos = 0;
        let inArray = false;
        let inObject = false;
        
        // Find the last valid position before truncation
        for (let i = 0; i < repaired.length; i++) {
          const char = repaired[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            insideString = !insideString;
            if (!insideString) {
              lastValidPos = i + 1;
            }
            continue;
          }
          
          if (insideString) {
            continue;
          }
          
          // Track structure depth
          if (char === '{') {
            depth++;
            inObject = true;
            lastValidPos = i + 1;
          } else if (char === '}') {
            depth--;
            if (depth === 0) {
              lastValidPos = i + 1;
              inObject = false;
            }
          } else if (char === '[') {
            inArray = true;
            lastValidPos = i + 1;
          } else if (char === ']') {
            inArray = false;
            lastValidPos = i + 1;
          } else if (char === ',' && depth > 0) {
            lastValidPos = i + 1;
          }
        }
        
        // Find the best truncation point
        // Look backwards from the end to find the last complete structure
        let bestTruncatePos = lastValidPos;
        
        // If inside a string, try to find where the last complete property was
        if (insideString) {
          // Look for the last complete property ending
          for (let i = repaired.length - 1; i >= Math.max(0, lastValidPos - 200); i--) {
            const char = repaired[i];
            // Check if we're outside a string at this position
            let checkInsideString = false;
            let checkEscape = false;
            for (let j = 0; j < i; j++) {
              if (checkEscape) {
                checkEscape = false;
                continue;
              }
              if (repaired[j] === '\\') {
                checkEscape = true;
                continue;
              }
              if (repaired[j] === '"') {
                checkInsideString = !checkInsideString;
              }
            }
            
            if (!checkInsideString && (char === ',' || char === '}' || char === ']')) {
              bestTruncatePos = i + 1;
              break;
            }
          }
        } else {
          // Find last complete property or array element
          for (let i = repaired.length - 1; i >= Math.max(0, lastValidPos - 200); i--) {
            const char = repaired[i];
            if (char === ',' || char === '}' || char === ']') {
              bestTruncatePos = i + 1;
              break;
            }
          }
        }
        
        repaired = repaired.substring(0, bestTruncatePos);
        
        // Clean up: remove trailing comma, incomplete properties
        repaired = repaired.replace(/,\s*$/, '');
        
        // Better handling of unterminated strings
        // Find if we're inside an unterminated string at the end
        let finalInsideString = false;
        let finalEscape = false;
        for (let i = 0; i < repaired.length; i++) {
          if (finalEscape) {
            finalEscape = false;
            continue;
          }
          if (repaired[i] === '\\') {
            finalEscape = true;
            continue;
          }
          if (repaired[i] === '"') {
            finalInsideString = !finalInsideString;
          }
        }
        
        // If we're inside a string at the end, we need to close it or remove it
        if (finalInsideString) {
          // Find the last opening quote (not escaped)
          let lastOpenQuote = -1;
          for (let i = repaired.length - 1; i >= 0; i--) {
            if (repaired[i] === '"') {
              // Check if escaped
              let escaped = false;
              for (let j = i - 1; j >= 0 && repaired[j] === '\\'; j--) {
                escaped = !escaped;
              }
              if (!escaped) {
                lastOpenQuote = i;
                break;
              }
            }
          }
          
          if (lastOpenQuote >= 0) {
            // Find the property this string belongs to
            const beforeQuote = repaired.substring(0, lastOpenQuote);
            // Look for property name patterns (like "verbalMnemonic", "audioScript", etc.)
            const propertyMatch = beforeQuote.match(/"(\w+)":\s*$/);
            if (propertyMatch) {
              // This is a property value - replace with empty string
              const colonPos = beforeQuote.lastIndexOf(':');
              repaired = repaired.substring(0, colonPos + 1) + ' ""';
              console.log(`🔧 Fixed unterminated string in property: ${propertyMatch[1]}`);
            } else {
              // Check if there's a colon nearby
              const colonPos = beforeQuote.lastIndexOf(':');
              if (colonPos > 0 && colonPos > beforeQuote.length - 20) {
                // Property value - replace with empty string
                repaired = repaired.substring(0, colonPos + 1) + ' ""';
              } else {
                // Just close the string
                repaired = repaired.substring(0, lastOpenQuote + 1) + '"';
              }
            }
          } else {
            // Fallback: remove incomplete string at end
            repaired = repaired.replace(/":\s*"[^"]*$/, '": ""');
          }
        }
        
        // Additional cleanup for incomplete string values - fallback for edge cases
        // This is a safety net in case the early fix didn't catch everything
        // Only fix if we still have an unterminated string (should be rare now)
        const stillUnterminated = /":\s*"[^"]*$/.test(repaired);
        if (stillUnterminated) {
          // Last resort: replace with empty string if we can't salvage it
          repaired = repaired.replace(/":\s*"[^"]*$/, '": ""');
          console.log('🔧 Applied fallback fix for unterminated string');
        }
        repaired = repaired.replace(/,\s*"[^"]*:\s*$/, ''); // Remove incomplete properties
        
        // Clean up trailing comma before closing brace (common after removing incomplete fields)
        repaired = repaired.replace(/,\s*}/g, '}');
        repaired = repaired.replace(/,\s*]/g, ']');
        
        // Count unclosed structures
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        const openArrays = (repaired.match(/\[/g) || []).length;
        const closeArrays = (repaired.match(/\]/g) || []).length;
        
        // Close incomplete arrays first
        if (openArrays > closeArrays) {
          repaired += ']'.repeat(openArrays - closeArrays);
        }
        
        // Close incomplete objects
        if (openBraces > closeBraces) {
          repaired += '}'.repeat(openBraces - closeBraces);
        }
        
        return repaired;
      };
      
      // Parse JSON response
      try {
        return JSON.parse(content);
      } catch (parseError) {
        // Try to repair incomplete JSON
        if (parseError.message?.includes('Unterminated') || parseError.message?.includes('Expected')) {
          console.log('🔧 Attempting to repair incomplete JSON...');
          try {
            const repaired = repairIncompleteJSON(content);
            console.log('📝 Repaired JSON length:', repaired.length);
            return JSON.parse(repaired);
          } catch (repairError) {
            console.error('❌ JSON repair failed:', repairError.message);
            
            // Last resort: Try to extract complete structures based on content type
            console.log('🔧 Attempting to extract complete structures...');
            try {
              // Check if this is text content with sections
              const sectionsMatch = content.match(/\{\s*"sections"\s*:\s*\[/);
              if (sectionsMatch) {
                console.log('🔧 Detected text content with sections, extracting complete sections...');
                const sectionsStart = sectionsMatch.index + sectionsMatch[0].length;
                const sectionsEnd = content.indexOf(']', sectionsStart);
                const contentEnd = sectionsEnd > sectionsStart ? sectionsEnd : content.length;
                const sectionsContent = content.substring(sectionsStart, contentEnd);
                
                // Extract complete section objects
                const completeSections = [];
                let depth = 0;
                let startPos = -1;
                let inString = false;
                let escapeNext = false;
                
                for (let i = 0; i < sectionsContent.length; i++) {
                  const char = sectionsContent[i];
                  
                  if (escapeNext) {
                    escapeNext = false;
                    continue;
                  }
                  
                  if (char === '\\') {
                    escapeNext = true;
                    continue;
                  }
                  
                  if (char === '"' && !escapeNext) {
                    inString = !inString;
                    continue;
                  }
                  
                  if (inString) continue;
                  
                  if (char === '{') {
                    if (depth === 0) startPos = i;
                    depth++;
                  } else if (char === '}') {
                    depth--;
                    if (depth === 0 && startPos >= 0) {
                      // Found a complete section object
                      let sectionJson = sectionsContent.substring(startPos, i + 1);
                      try {
                        const parsed = JSON.parse(sectionJson);
                        // Check if it has minimum required fields
                        if (parsed.heading && parsed.content) {
                          completeSections.push(sectionJson);
                          console.log(`✅ Extracted complete section: ${parsed.heading}`);
                        } else {
                          // Try to repair the section
                          const repairedSection = repairIncompleteJSON(sectionJson);
                          const repairedParsed = JSON.parse(repairedSection);
                          if (repairedParsed.heading) {
                            completeSections.push(repairedSection);
                            console.log(`✅ Repaired and extracted section: ${repairedParsed.heading}`);
                          }
                        }
                      } catch (e) {
                        // Try to repair
                        try {
                          const repairedSection = repairIncompleteJSON(sectionJson);
                          const repairedParsed = JSON.parse(repairedSection);
                          if (repairedParsed.heading) {
                            completeSections.push(repairedSection);
                            console.log(`✅ Repaired and extracted section: ${repairedParsed.heading}`);
                          }
                        } catch (repairErr) {
                          console.log(`⚠️ Skipped invalid section at position ${startPos}`);
                        }
                      }
                      startPos = -1;
                    }
                  }
                }
                
                if (completeSections.length > 0) {
                  // Reconstruct valid text content JSON
                  const sectionsJson = completeSections.map((s, i) => 
                    `    ${s}${i < completeSections.length - 1 ? ',' : ''}`
                  ).join('\n');
                  
                  // Extract title and introduction if available (handle escaped quotes)
                  const titleMatch = content.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                  const introMatch = content.match(/"introduction"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                  
                  const reconstructed = `{
  "title": ${titleMatch ? `"${titleMatch[1]}"` : '"Topic Title"'},
  "introduction": ${introMatch ? `"${introMatch[1]}"` : '""'},
  "sections": [
${sectionsJson}
  ],
  "summary": "",
  "keyTakeaways": []
}`;
                  const parsed = JSON.parse(reconstructed);
                  console.log(`✅ Extracted ${completeSections.length} complete section(s) from truncated text content`);
                  return parsed;
                }
              }
              
              // Check if this is visual content with visualElements
              const visualElementsMatch = content.match(/\{\s*"visualElements"\s*:\s*\[/);
              if (visualElementsMatch) {
                console.log('🔧 Detected visual content with visualElements, extracting complete elements...');
                const elementsStart = visualElementsMatch.index + visualElementsMatch[0].length;
                const elementsEnd = content.indexOf(']', elementsStart);
                const contentEnd = elementsEnd > elementsStart ? elementsEnd : content.length;
                const elementsContent = content.substring(elementsStart, contentEnd);
                
                // Extract complete visual element objects
                const completeElements = [];
                let depth = 0;
                let startPos = -1;
                let inString = false;
                let escapeNext = false;
                
                for (let i = 0; i < elementsContent.length; i++) {
                  const char = elementsContent[i];
                  
                  if (escapeNext) {
                    escapeNext = false;
                    continue;
                  }
                  
                  if (char === '\\') {
                    escapeNext = true;
                    continue;
                  }
                  
                  if (char === '"' && !escapeNext) {
                    inString = !inString;
                    continue;
                  }
                  
                  if (inString) continue;
                  
                  if (char === '{') {
                    if (depth === 0) startPos = i;
                    depth++;
                  } else if (char === '}') {
                    depth--;
                    if (depth === 0 && startPos >= 0) {
                      // Found a complete element object
                      let elementJson = elementsContent.substring(startPos, i + 1);
                      try {
                        const parsed = JSON.parse(elementJson);
                        // Check if it has minimum required fields
                        if (parsed.type && parsed.description) {
                          completeElements.push(elementJson);
                          console.log(`✅ Extracted complete visual element: ${parsed.type}`);
                        } else {
                          // Try to repair the element
                          const repairedElement = repairIncompleteJSON(elementJson);
                          const repairedParsed = JSON.parse(repairedElement);
                          if (repairedParsed.type) {
                            completeElements.push(repairedElement);
                            console.log(`✅ Repaired and extracted visual element: ${repairedParsed.type}`);
                          }
                        }
                      } catch (e) {
                        // Try to repair
                        try {
                          const repairedElement = repairIncompleteJSON(elementJson);
                          const repairedParsed = JSON.parse(repairedElement);
                          if (repairedParsed.type) {
                            completeElements.push(repairedElement);
                            console.log(`✅ Repaired and extracted visual element: ${repairedParsed.type}`);
                          }
                        } catch (repairErr) {
                          console.log(`⚠️ Skipped invalid visual element at position ${startPos}`);
                        }
                      }
                      startPos = -1;
                    }
                  }
                }
                
                if (completeElements.length > 0) {
                  // Reconstruct valid visual content JSON
                  const elementsJson = completeElements.map((e, i) => 
                    `    ${e}${i < completeElements.length - 1 ? ',' : ''}`
                  ).join('\n');
                  
                  // Extract title if available
                  const titleMatch = content.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                  
                  const reconstructed = `{
  "title": ${titleMatch ? `"${titleMatch[1]}"` : '"Topic Title"'},
  "visualElements": [
${elementsJson}
  ],
  "summary": ""
}`;
                  const parsed = JSON.parse(reconstructed);
                  console.log(`✅ Extracted ${completeElements.length} complete visual element(s) from truncated visual content`);
                  return parsed;
                }
              }
              
              // Special handling for quiz JSON - extract complete question objects
              const quizMatch = content.match(/\{\s*"questions"\s*:\s*\[/);
              if (quizMatch) {
                // This looks like quiz JSON - try to extract complete questions
                const questionsStart = quizMatch.index + quizMatch[0].length;
                // Find the end of the questions array, or use end of content if not found (truncated)
                const questionsEnd = content.indexOf(']', questionsStart);
                const contentEnd = questionsEnd > questionsStart ? questionsEnd : content.length;
                
                // Extract the questions array content (or what we have if truncated)
                const questionsContent = content.substring(questionsStart, contentEnd);
                
                // Find all complete question objects (they end with })
                // Also handle incomplete questions that can be repaired
                const completeQuestions = [];
                let depth = 0;
                let startPos = -1;
                let inString = false;
                let escapeNext = false;
                
                for (let i = 0; i < questionsContent.length; i++) {
                  const char = questionsContent[i];
                  
                  if (escapeNext) {
                    escapeNext = false;
                    continue;
                  }
                  
                  if (char === '\\') {
                    escapeNext = true;
                    continue;
                  }
                  
                  if (char === '"' && !escapeNext) {
                    inString = !inString;
                    continue;
                  }
                  
                  if (inString) continue;
                  
                  if (char === '{') {
                    if (depth === 0) startPos = i;
                    depth++;
                  } else if (char === '}') {
                    depth--;
                    if (depth === 0 && startPos >= 0) {
                      // Found a complete question object
                      let questionJson = questionsContent.substring(startPos, i + 1);
                      try {
                        // Validate it's valid JSON
                        JSON.parse(questionJson);
                        completeQuestions.push(questionJson);
                      } catch (e) {
                        // Try to repair the question before rejecting it
                        console.log(`⚠️ Question at position ${startPos} is invalid, attempting repair...`);
                        try {
                          // Try to fix unterminated strings in this question
                          const repairedQuestion = repairIncompleteJSON(questionJson);
                          const parsed = JSON.parse(repairedQuestion);
                          // Check if it has minimum required fields
                          if (parsed.id && parsed.question && parsed.correctAnswer) {
                            completeQuestions.push(repairedQuestion);
                            console.log(`✅ Repaired and accepted question ${parsed.id}`);
                          } else {
                            console.log(`⚠️ Skipped question - missing required fields`);
                          }
                        } catch (repairErr) {
                          // If repair fails, check if we can salvage a minimal version
                          try {
                            // Extract just the essential fields if possible
                            const idMatch = questionJson.match(/"id"\s*:\s*(\d+)/);
                            const questionMatch = questionJson.match(/"question"\s*:\s*"([^"]+)"/);
                            const answerMatch = questionJson.match(/"correctAnswer"\s*:\s*"([^"]+)"/);
                            const typeMatch = questionJson.match(/"type"\s*:\s*"([^"]+)"/);
                            
                            if (idMatch && questionMatch && answerMatch) {
                              // Build a minimal valid question
                              const minimalQuestion = {
                                id: parseInt(idMatch[1]),
                                question: questionMatch[1],
                                type: typeMatch ? typeMatch[1] : "short_answer",
                                options: [],
                                correctAnswer: answerMatch[1],
                                explanation: "",
                                hint: "",
                                points: 10
                              };
                              completeQuestions.push(JSON.stringify(minimalQuestion));
                              console.log(`✅ Created minimal question ${minimalQuestion.id} from incomplete data`);
                            } else {
                              console.log(`⚠️ Skipped invalid question - cannot extract essential fields`);
                            }
                          } catch (minimalErr) {
                            console.log(`⚠️ Skipped invalid question at position ${startPos} - repair failed`);
                          }
                        }
                      }
                      startPos = -1;
                    }
                  }
                }
                
                // Handle case where we have an incomplete question at the end (no closing brace)
                if (startPos >= 0 && depth > 0) {
                  // We have an incomplete question object - try to extract essential fields
                  console.log(`⚠️ Found incomplete question at end, attempting to extract...`);
                  const incompleteQuestion = questionsContent.substring(startPos);
                  try {
                    // Try to extract essential fields from incomplete JSON
                    const idMatch = incompleteQuestion.match(/"id"\s*:\s*(\d+)/);
                    const questionMatch = incompleteQuestion.match(/"question"\s*:\s*"([^"]+)"/);
                    const answerMatch = incompleteQuestion.match(/"correctAnswer"\s*:\s*"([^"]+)"/);
                    const typeMatch = incompleteQuestion.match(/"type"\s*:\s*"([^"]+)"/);
                    
                    if (idMatch && questionMatch && answerMatch) {
                      // Build a minimal valid question
                      const minimalQuestion = {
                        id: parseInt(idMatch[1]),
                        question: questionMatch[1],
                        type: typeMatch ? typeMatch[1] : "short_answer",
                        options: [],
                        correctAnswer: answerMatch[1],
                        explanation: "",
                        hint: "",
                        points: 10
                      };
                      completeQuestions.push(JSON.stringify(minimalQuestion));
                      console.log(`✅ Created minimal question ${minimalQuestion.id} from incomplete question at end`);
                    }
                  } catch (e) {
                    console.log(`⚠️ Could not extract incomplete question at end`);
                  }
                }
                
                if (completeQuestions.length > 0) {
                  // Reconstruct valid quiz JSON with only complete questions
                  const questionsJson = completeQuestions.map((q, i) => 
                    `    ${q}${i < completeQuestions.length - 1 ? ',' : ''}`
                  ).join('\n');
                  const reconstructed = `{
  "questions": [
${questionsJson}
  ],
  "totalPoints": ${completeQuestions.length * 10}
}`;
                  const parsed = JSON.parse(reconstructed);
                  console.log(`✅ Extracted ${completeQuestions.length} complete question(s) from truncated quiz`);
                  return parsed;
                }
              }
              
              // Fallback: Try to extract the last complete object/array
              const lastCompleteMatch = content.match(/(\{[\s\S]*?\})(?=\s*$)/);
              if (lastCompleteMatch) {
                const partialJson = lastCompleteMatch[1];
                // Try to wrap it in a minimal valid structure
                const wrapped = `{"partial": true, "data": ${partialJson}}`;
                const parsed = JSON.parse(wrapped);
                console.log('✅ Extracted partial JSON structure');
                return parsed.data || parsed;
              }
            } catch (extractError) {
              console.error('❌ Extraction also failed:', extractError.message);
            }
          }
        }
        // Try to extract JSON from markdown code blocks (in case model ignores instruction)
        const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/) || 
                         content.match(/```json\s*([\s\S]*?)```/) ||
                         content.match(/```\s*\n([\s\S]*?)\n```/) ||
                         content.match(/```\s*([\s\S]*?)```/) ||
                         content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedJson = jsonMatch[1] || jsonMatch[0];
            console.log('📝 Extracted JSON (first 200 chars):', extractedJson.substring(0, 200));
            return JSON.parse(extractedJson);
          } catch (e) {
            console.error('Failed to parse extracted JSON:', e.message);
            console.error('Extracted JSON (first 500 chars):', (jsonMatch[1] || jsonMatch[0]).substring(0, 500));
          }
        }
        console.error('❌ Raw response (first 1000 chars):', content.substring(0, 1000));
        console.error('❌ Parse error:', parseError.message);
        throw new Error('Failed to parse AI response as JSON. The response may be incomplete or malformed.');
      }
    } catch (error) {
      const errorMsg = error.message || String(error);
      
      // If model not found, try next model
      if (errorMsg.includes('not found') || errorMsg.includes('not supported') || errorMsg.includes('not available') || errorMsg.includes('404')) {
        console.log(`Model ${modelName} not available, trying next...`);
        errors.push(`Model ${modelName} not available`);
        continue; // Try next model
      }
      
      // Quota/rate limit errors - provide helpful message
      if (errorMsg.includes('quota') || errorMsg.includes('Quota exceeded') || errorMsg.includes('rate limit')) {
        throw new Error(
          `Google Gemini API quota exceeded.\n\n` +
          `Free tier limits:\n` +
          `- Requests per minute: 60\n` +
          `- Requests per day: 1,500\n` +
          `- Tokens per day: 1 million\n\n` +
          `Solutions:\n` +
          `1. Wait a moment and try again\n` +
          `2. Check usage at: https://aistudio.google.com/app/apikey\n` +
          `3. Consider using Ollama (local, unlimited): Set AI_PROVIDER=ollama in .env\n\n` +
          `Original error: ${errorMsg}`
        );
      }
      
      // API key errors
      if (errorMsg.includes('API key') || errorMsg.includes('invalid') || errorMsg.includes('401') || errorMsg.includes('403')) {
        throw new Error('Invalid Google Gemini API key. Please check your GOOGLE_AI_API_KEY in .env file.');
      }
      
      // Other errors, throw immediately
      throw error;
    }
  }
  
  // If we get here, all models failed
  const errorSummary = errors.length > 0 
    ? `Tried ${modelsToTry.length} models, all failed:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
    : 'All model attempts failed';
  
  throw new Error(
    `All Google Gemini models failed. ${errorSummary}\n\n` +
    `Possible solutions:\n` +
    `1. Verify your API key is correct and active at https://makersuite.google.com/app/apikey\n` +
    `2. Check that your API key has access to Gemini models\n` +
    `3. Try creating a new API key\n` +
    `4. Ensure your API key starts with "AIza" and is set in .env as GOOGLE_AI_API_KEY\n` +
    `5. Consider using Ollama (local, free): Set AI_PROVIDER=ollama in .env`
  );
}

/**
 * Call Ollama API (Local AI - No API key needed!)
 */
async function callOllama(prompt, options = {}) {
  try {
    // Default Ollama URL (runs locally)
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    // Default to phi3 (smaller, less memory) or use llama3.2 if you have enough RAM
    const model = options.model || process.env.OLLAMA_MODEL || 'phi3';
    
    const url = `${ollamaUrl}/api/generate`;
    
    console.log(`Using Ollama: ${model} at ${ollamaUrl}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt + '\n\nCRITICAL INSTRUCTIONS:\n1. You MUST respond with ONLY valid, complete JSON. Do NOT use markdown code blocks (no ```json or ```).\n2. Keep ALL content CONCISE and SUMMARIZED. Limit text to 2-3 paragraphs per section maximum.\n3. Do NOT truncate the response. The JSON must be complete and properly closed.\n4. Start with { and end with }. Return ONLY the JSON object, nothing else.\n5. Prioritize completeness over length - ensure the entire JSON fits within token limits.',
        stream: false, // Get complete response
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.max_tokens || 4000, // Increased for complete responses
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text().catch(() => '');
      let errorMsg = 'Unknown error';
      
      try {
        const parsed = JSON.parse(errorData);
        errorMsg = parsed.error || errorData;
      } catch {
        errorMsg = errorData || `HTTP ${response.status}`;
      }
      
      // Provide helpful error messages
      if (errorMsg.includes('connection refused') || errorMsg.includes('ECONNREFUSED')) {
        throw new Error(
          'Cannot connect to Ollama. Make sure Ollama is running:\n' +
          '1. Install Ollama: https://ollama.ai\n' +
          '2. Start Ollama service\n' +
          '3. Pull a model: ollama pull llama3.2\n' +
          '4. Verify: ollama list'
        );
      }
      
      if (errorMsg.includes('model') && errorMsg.includes('not found')) {
        throw new Error(
          `Ollama model '${model}' not found. Available models:\n` +
          'Run: ollama pull phi3 (smaller model) or ollama pull llama3.2\n' +
          'Popular models: phi3 (smallest), llama3.2, mistral, gemma2'
        );
      }
      
      // Memory issues - suggest smaller model
      if (errorMsg.includes('memory') || errorMsg.includes('system memory') || errorMsg.includes('not enough')) {
        throw new Error(
          `Model '${model}' requires more RAM than available.\n\n` +
          `Solutions:\n` +
          `1. Use a smaller model: ollama pull phi3 (requires ~2GB RAM)\n` +
          `2. Update .env: OLLAMA_MODEL=phi3\n` +
          `3. Close other applications to free up RAM\n` +
          `4. Or use cloud AI (Google Gemini) instead: Set AI_PROVIDER=google in .env`
        );
      }
      
      throw new Error(`Ollama API error: ${errorMsg}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error('Invalid response format from Ollama');
    }
    
    const content = data.response;
    
    // Parse JSON response
    let jsonContent = content.trim();
    
    // First, try to extract JSON from markdown code blocks
    // Handle various markdown formats: ```json ... ```, ``` ... ```, etc.
    const markdownPatterns = [
      /```json\s*\n([\s\S]*?)\n```/,  // ```json\n...\n```
      /```json\s*([\s\S]*?)```/,       // ```json...```
      /```\s*\n([\s\S]*?)\n```/,       // ```\n...\n```
      /```\s*([\s\S]*?)```/,           // ```...```
    ];
    
    for (const pattern of markdownPatterns) {
      const match = jsonContent.match(pattern);
      if (match) {
        jsonContent = match[1].trim();
        break;
      }
    }
    
    // Try to find JSON object in the content
    if (!jsonContent.startsWith('{')) {
      const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonContent = jsonObjectMatch[0];
      }
    }
    
    // Try to fix incomplete JSON (common with truncated responses)
    if (!jsonContent.endsWith('}')) {
      // Count open and close braces
      const openBraces = (jsonContent.match(/\{/g) || []).length;
      const closeBraces = (jsonContent.match(/\}/g) || []).length;
      const missingBraces = openBraces - closeBraces;
      
      if (missingBraces > 0) {
        // Try to close incomplete arrays and objects
        let fixedJson = jsonContent;
        
        // Close incomplete arrays
        const openArrays = (fixedJson.match(/\[/g) || []).length;
        const closeArrays = (fixedJson.match(/\]/g) || []).length;
        fixedJson += ']'.repeat(openArrays - closeArrays);
        
        // Close incomplete strings (if last string is unclosed)
        if (fixedJson.match(/"[^"]*$/)) {
          fixedJson = fixedJson.replace(/"([^"]*)$/, '"$1"');
        }
        
        // Close incomplete objects
        fixedJson += '}'.repeat(missingBraces);
        
        jsonContent = fixedJson;
      }
    }
    
    // Try parsing
    try {
      return JSON.parse(jsonContent);
    } catch (parseError) {
      // If still fails, try to extract just the JSON object part
      const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          return JSON.parse(jsonObjectMatch[0]);
        } catch (e) {
          console.error('Failed to parse extracted JSON object:', e.message);
        }
      }
      
      console.error('Failed to parse JSON. Raw response:', content.substring(0, 500));
      console.error('Extracted JSON content:', jsonContent.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON. The response may be incomplete or malformed.');
    }
  } catch (error) {
    console.error('Ollama API call failed:', error);
    throw error;
  }
}

