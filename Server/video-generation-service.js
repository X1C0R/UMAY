/**
 * Video Generation Service
 * Converts text content into video tutorials programmatically
 * Uses ffmpeg to combine audio, images, and text overlays
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Optional imports - video generation will work without these if not available
let ffmpeg = null;
let fetch = null;

// Initialize imports lazily
async function initializeImports() {
  if (ffmpeg === null) {
    try {
      const ffmpegModule = await import('fluent-ffmpeg');
      ffmpeg = ffmpegModule.default || ffmpegModule;
    } catch (e) {
      console.warn('fluent-ffmpeg not available, video generation will use exec directly');
      ffmpeg = false; // Mark as unavailable
    }
  }
  
  if (fetch === null) {
    try {
      fetch = (await import('node-fetch')).default;
    } catch (e) {
      // Use global fetch if available (Node 18+)
      if (typeof globalThis.fetch === 'function') {
        fetch = globalThis.fetch;
      } else {
        console.warn('node-fetch not available, using global fetch');
        fetch = globalThis.fetch;
      }
    }
  }
}

const execAsync = promisify(exec);

// Import TTS function - avoid circular dependency by passing it as parameter
let ttsFunction = null;

/**
 * Find FFmpeg executable path
 * Checks PATH first, then common installation locations
 */
async function findFFmpegPath() {
  // First, try to find it in PATH
  try {
    await execAsync('ffmpeg -version');
    return 'ffmpeg'; // Found in PATH
  } catch (error) {
    // Not in PATH, try common locations
    const commonPaths = [
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
      path.join(process.env.PROGRAMFILES || '', 'ffmpeg', 'bin', 'ffmpeg.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'ffmpeg', 'bin', 'ffmpeg.exe'),
    ];

    // On Windows, also check WinGet packages directory
    if (process.platform === 'win32') {
      const wingetPackagesDir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
      if (fs.existsSync(wingetPackagesDir)) {
        try {
          // Search for ffmpeg.exe in WinGet packages
          const packages = fs.readdirSync(wingetPackagesDir);
          for (const pkg of packages) {
            const pkgPath = path.join(wingetPackagesDir, pkg);
            if (fs.statSync(pkgPath).isDirectory()) {
              const ffmpegExe = path.join(pkgPath, 'bin', 'ffmpeg.exe');
              if (fs.existsSync(ffmpegExe)) {
                commonPaths.push(ffmpegExe);
              }
              // Also check root of package directory
              const ffmpegExeRoot = path.join(pkgPath, 'ffmpeg.exe');
              if (fs.existsSync(ffmpegExeRoot)) {
                commonPaths.push(ffmpegExeRoot);
              }
            }
          }
        } catch (e) {
          // Ignore errors searching WinGet packages
        }
      }
    }

    for (const ffmpegPath of commonPaths) {
      if (ffmpegPath && fs.existsSync(ffmpegPath)) {
        console.log(`✅ Found FFmpeg at: ${ffmpegPath}`);
        return ffmpegPath;
      }
    }

    // Try to find it using where command (Windows) - might work if in PATH but shell hasn't reloaded
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('where.exe ffmpeg');
        const foundPath = stdout.trim().split('\n')[0].trim();
        if (foundPath && fs.existsSync(foundPath)) {
          console.log(`✅ Found FFmpeg at: ${foundPath}`);
          return foundPath;
        }
      } catch (e) {
        // where.exe didn't find it
      }
    }

    return null;
  }
}

// Cache the FFmpeg path once found
let cachedFFmpegPath = null;

/**
 * Get FFmpeg executable path (cached)
 */
function getFFmpegPath() {
  return cachedFFmpegPath || 'ffmpeg';
}

/**
 * Get FFprobe executable path (same directory as FFmpeg)
 */
function getFFprobePath() {
  if (!cachedFFmpegPath || cachedFFmpegPath === 'ffmpeg') {
    return 'ffprobe'; // Assume in PATH if ffmpeg is in PATH
  }
  
  // Replace ffmpeg.exe with ffprobe.exe in the path
  const ffprobePath = cachedFFmpegPath.replace(/ffmpeg\.exe$/i, 'ffprobe.exe');
  
  // Check if ffprobe exists in the same directory
  if (fs.existsSync(ffprobePath)) {
    return ffprobePath;
  }
  
  // Fallback: try common locations relative to ffmpeg
  const dir = path.dirname(cachedFFmpegPath);
  const commonProbePaths = [
    path.join(dir, 'ffprobe.exe'),
    path.join(dir, 'bin', 'ffprobe.exe'),
  ];
  
  for (const probePath of commonProbePaths) {
    if (fs.existsSync(probePath)) {
      return probePath;
    }
  }
  
  // Last resort: assume in PATH
  return 'ffprobe';
}

export function setTTSFunction(func) {
  ttsFunction = func;
}

/**
 * Generate a video from text content
 * @param {Object} content - Content object with text, title, sections, etc.
 * @param {string} subject - Subject name
 * @param {string} topic - Topic name
 * @returns {Promise<string>} - URL to generated video file
 */
export async function generateVideoFromText(content, subject, topic) {
  try {
    // Initialize imports
    await initializeImports();
    
    console.log('🎬 Starting video generation from text content...');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create temporary directory for video assets
    const tempDir = path.join(uploadsDir, `temp_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Step 1: Generate audio narration from text
      console.log('🎤 Generating audio narration...');
      const narrationText = buildNarrationText(content);
      
      if (!ttsFunction) {
        throw new Error('TTS function not set. Call setTTSFunction() first.');
      }
      
      const ttsResult = await ttsFunction(narrationText, { language: 'en' });
      
      // Handle TTS result (can be URL string or object with audioUrl)
      let audioUrl = typeof ttsResult === 'string' ? ttsResult : ttsResult.audioUrl;
      
      if (!audioUrl) {
        throw new Error('TTS function did not return a valid audio URL');
      }
      
      // If audioUrl is relative, make it absolute
      const API_URL = process.env.API_URL || 'http://localhost:4000';
      if (audioUrl.startsWith('/')) {
        audioUrl = `${API_URL}${audioUrl}`;
      }
      
      // Download audio file
      const audioPath = path.join(tempDir, 'narration.mp3');
      await downloadFile(audioUrl, audioPath);
      console.log('✅ Audio narration generated');

      // Step 2: Create video slides from content
      console.log('📽️ Creating video slides...');
      const slides = await createVideoSlides(content, tempDir);
      console.log(`✅ Created ${slides.length} slides`);

      // Step 3: Combine slides and audio into video
      console.log('🎬 Combining slides and audio into video...');
      
      // Check if ffmpeg is available
      if (!cachedFFmpegPath) {
        cachedFFmpegPath = await findFFmpegPath();
      }
      
      if (!cachedFFmpegPath) {
        console.error('❌ FFmpeg is not installed or not found');
        console.error('   To install FFmpeg:');
        console.error('   - Windows: winget install --id=Gyan.FFmpeg -e');
        console.error('   - Windows (Chocolatey): choco install ffmpeg');
        console.error('   - Windows: Download from https://ffmpeg.org/download.html');
        console.error('   - macOS: brew install ffmpeg');
        console.error('   - Linux: sudo apt-get install ffmpeg');
        console.error('   Note: After installation, restart your terminal or add FFmpeg to PATH');
        throw new Error('FFmpeg is not installed. Video generation requires FFmpeg to be installed.');
      }
      
      console.log('✅ FFmpeg is available');
      
      const videoPath = await combineSlidesAndAudio(slides, audioPath, tempDir, subject, topic);
      console.log('✅ Video generated successfully');

      // Clean up temporary files
      cleanupTempFiles(tempDir);

      // Return video URL
      const filename = path.basename(videoPath);
      return `/uploads/${filename}`;
    } catch (error) {
      // Clean up on error
      cleanupTempFiles(tempDir);
      console.error('❌ Error in video generation process:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error generating video:', error);
    console.error('   Error details:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  }
}

/**
 * Build narration text from content
 */
function buildNarrationText(content) {
  let narration = '';
  
  if (content.title) {
    narration += `${content.title}. `;
  }
  
  if (content.introduction) {
    narration += `${content.introduction} `;
  }
  
  // Add sections content
  if (content.sections && Array.isArray(content.sections)) {
    content.sections.forEach((section, index) => {
      if (section.heading) {
        narration += `Section ${index + 1}: ${section.heading}. `;
      }
      if (section.content) {
        narration += `${section.content} `;
      }
    });
  }
  
  // Add visual elements descriptions
  if (content.visualElements && Array.isArray(content.visualElements)) {
    content.visualElements.forEach((element, index) => {
      if (element.description) {
        narration += `${element.description} `;
      }
      if (element.content) {
        narration += `${element.content} `;
      }
    });
  }
  
  if (content.summary) {
    narration += `Summary: ${content.summary}`;
  }
  
  return narration.trim();
}

/**
 * Create video slides from content
 * Uses HTML/CSS to create slides, then converts to images
 */
async function createVideoSlides(content, tempDir) {
  const slides = [];
  const slideDuration = 5; // seconds per slide
  
  let slideIndex = 0;
  
  // Slide 1: Title slide
  if (content.title) {
    const titleSlide = await createSlideImage({
      title: content.title,
      subtitle: content.introduction || '',
      type: 'title',
      index: slideIndex
    }, tempDir, 0);
    slides.push({ path: titleSlide, duration: slideDuration });
    slideIndex++;
  }
  
  // Slides for sections
  if (content.sections && Array.isArray(content.sections)) {
    for (let i = 0; i < content.sections.length; i++) {
      const section = content.sections[i];
      
      // Ensure slide has content - combine heading, content, and key concepts
      let slideContent = section.content || '';
      const keyConcepts = section.keyConcepts || [];
      
      // If content is empty or very short, use key concepts as content
      if (!slideContent || slideContent.trim().length < 20) {
        if (keyConcepts.length > 0) {
          slideContent = keyConcepts.join('. ') + '.';
        } else {
          // Generate a brief description from the heading
          slideContent = `This section covers ${section.heading || `Section ${i + 1}`}.`;
        }
      }
      
      // Add key concepts to content if not already included
      if (keyConcepts.length > 0 && slideContent) {
        const conceptsText = keyConcepts.filter(kc => !slideContent.includes(kc)).join(', ');
        if (conceptsText) {
          slideContent += ` Key concepts: ${conceptsText}.`;
        }
      }
      
      const slidePath = await createSlideImage({
        title: section.heading || `Section ${i + 1}`,
        content: slideContent,
        keyPoints: keyConcepts,
        type: 'content',
        index: slideIndex,
        keyConcepts: keyConcepts
      }, tempDir, i + 1);
      slides.push({ path: slidePath, duration: slideDuration });
      slideIndex++;
    }
  }
  
  // Slides for visual elements
  if (content.visualElements && Array.isArray(content.visualElements)) {
    for (let i = 0; i < content.visualElements.length; i++) {
      const element = content.visualElements[i];
      
      // Ensure visual element slide has content
      let visualContent = element.description || element.content || '';
      if (!visualContent || visualContent.trim().length < 10) {
        visualContent = `This visual element illustrates ${element.type || 'important concepts'}.`;
        if (element.colorScheme) {
          visualContent += ` Color scheme: ${element.colorScheme}.`;
        }
      }
      
      // For diagram/visual slides, add a note about the visual representation
      let enhancedContent = visualContent;
      if (element.type && element.type.toLowerCase().includes('diagram')) {
        enhancedContent = `📊 ${visualContent} This diagram helps visualize the concept.`;
      } else if (element.type && (element.type.toLowerCase().includes('visual') || element.type.toLowerCase().includes('chart'))) {
        enhancedContent = `📈 ${visualContent} This visual representation illustrates the key concepts.`;
      }
      
      const slidePath = await createSlideImage({
        title: element.type || 'Visual Element',
        content: enhancedContent,
        imageUrl: element.imageUrl,
        type: 'visual',
        index: slideIndex,
        keyPoints: element.colorScheme ? [element.colorScheme] : []
      }, tempDir, `visual_${i}`);
      slides.push({ path: slidePath, duration: slideDuration });
      slideIndex++;
    }
  }
  
  // Summary slide
  if (content.summary) {
    const summarySlide = await createSlideImage({
      title: 'Summary',
      content: content.summary,
      type: 'summary',
      index: slideIndex
    }, tempDir, 'summary');
    slides.push({ path: summarySlide, duration: slideDuration });
    slideIndex++;
  }
  
  return slides;
}

/**
 * Create a single slide image using HTML/CSS and convert to image
 */
async function createSlideImage(slideData, tempDir, index) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 1920px;
      height: 1080px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: 'Arial', sans-serif;
      color: white;
    }
    .slide-container {
      width: 90%;
      max-width: 1600px;
      text-align: center;
      padding: 60px;
    }
    .title {
      font-size: 72px;
      font-weight: bold;
      margin-bottom: 30px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .subtitle {
      font-size: 36px;
      margin-bottom: 40px;
      opacity: 0.9;
    }
    .content {
      font-size: 42px;
      line-height: 1.6;
      margin-bottom: 30px;
      text-align: left;
    }
    .key-points {
      text-align: left;
      font-size: 36px;
      margin-top: 30px;
    }
    .key-points li {
      margin-bottom: 15px;
    }
    .image-container {
      margin: 30px 0;
      max-width: 100%;
    }
    .image-container img {
      max-width: 100%;
      max-height: 600px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div class="slide-container">
    <h1 class="title">${escapeHtml(slideData.title || 'Slide')}</h1>
    ${slideData.subtitle ? `<p class="subtitle">${escapeHtml(slideData.subtitle)}</p>` : ''}
    ${slideData.content ? `<div class="content">${escapeHtml(slideData.content)}</div>` : ''}
    ${slideData.imageUrl ? `<div class="image-container"><img src="${slideData.imageUrl}" alt="Visual" /></div>` : ''}
    ${slideData.keyPoints && slideData.keyPoints.length > 0 ? `
      <ul class="key-points">
        ${slideData.keyPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
    ` : ''}
  </div>
</body>
</html>
  `;
  
  const htmlPath = path.join(tempDir, `slide_${index}.html`);
  fs.writeFileSync(htmlPath, html);
  
  // Convert HTML to image using headless browser or canvas
  // For now, we'll use a simpler approach with canvas or puppeteer
  // Since puppeteer might be heavy, we'll use a Node.js canvas library
  const imagePath = path.join(tempDir, `slide_${index}.png`);
  
  // Use a simple approach: create image with text using canvas
  await createSlideWithCanvas(slideData, imagePath);
  
  return imagePath;
}

/**
 * Create slide image - uses ImageMagick or creates simple placeholder
 */
async function createSlideWithCanvas(slideData, outputPath) {
  // Try ImageMagick first (simpler, no compilation needed)
  try {
    const slideType = slideData.type || 'content';
    const slideIndex = parseInt(slideData.index) || 0;
    const colorScheme = getColorScheme(slideType, slideIndex);
    
    const title = (slideData.title || 'Slide').substring(0, 100);
    const content = slideData.content ? slideData.content.substring(0, 300) : '';
    
    // Convert hex colors to ImageMagick format (remove 0x prefix)
    const bg1Color = `#${colorScheme.bg1.substring(2)}`;
    const bg2Color = `#${colorScheme.bg2.substring(2)}`;
    const textColor = colorScheme.accent === 'white' ? 'white' : 'black';
    
    // Use ImageMagick to create gradient background with styled text
    // Create gradient background, then add text with shadow effects
    const gradientCmd = `magick -size 1920x1080 gradient:"${bg1Color}-${bg2Color}" -gravity center -pointsize 80 -fill ${textColor} -font Arial-Bold -stroke black -strokewidth 2 -annotate +0-150 "${title.replace(/"/g, '\\"')}" -pointsize 48 -fill ${textColor} -stroke black -strokewidth 1 -annotate +0+50 "${content.replace(/"/g, '\\"').substring(0, 200)}" "${outputPath}"`;
    
    await execAsync(gradientCmd, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      windowsHide: true // Hide window on Windows
    });
    
    // Verify the image was created
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return;
    }
  } catch (error) {
    // Silently fall back - ImageMagick is optional
    // Only log if it's not a "command not found" error
    if (!error.message?.includes('not recognized') && !error.message?.includes('not found')) {
      console.warn('ImageMagick command failed, using fallback method');
    }
  }
  
  // Final fallback: create simple colored image
  await createSimpleSlideImage(slideData, outputPath);
}

/**
 * Generate example based on content topic
 */
function generateExample(title, content, keyPoints) {
  if (!title && !content) return null;
  
  const topic = (title || content || '').toLowerCase();
  
  // Generate examples based on topic keywords
  if (topic.includes('algebra') || topic.includes('equation') || topic.includes('solve')) {
    return 'Example: Solve for x: 2x + 5 = 15 → x = 5';
  } else if (topic.includes('geometry') || topic.includes('area') || topic.includes('perimeter')) {
    return 'Example: Rectangle area = length × width = 5 × 3 = 15 square units';
  } else if (topic.includes('fraction') || topic.includes('divide')) {
    return 'Example: 1/2 + 1/4 = 2/4 + 1/4 = 3/4';
  } else if (topic.includes('percentage') || topic.includes('percent')) {
    return 'Example: 25% of 80 = 0.25 × 80 = 20';
  } else if (topic.includes('function') || topic.includes('f(x)')) {
    return 'Example: f(x) = x² + 2x + 1, when x = 3: f(3) = 9 + 6 + 1 = 16';
  } else if (topic.includes('derivative') || topic.includes('differentiate')) {
    return 'Example: d/dx(x²) = 2x';
  } else if (topic.includes('integral') || topic.includes('integrate')) {
    return 'Example: ∫x dx = x²/2 + C';
  } else if (topic.includes('trigonometry') || topic.includes('sin') || topic.includes('cos')) {
    return 'Example: sin(30°) = 1/2, cos(60°) = 1/2';
  } else if (topic.includes('quadratic') || topic.includes('x²')) {
    return 'Example: x² - 5x + 6 = 0 → (x-2)(x-3) = 0 → x = 2 or x = 3';
  } else if (topic.includes('linear') || topic.includes('slope')) {
    return 'Example: y = 2x + 3, slope = 2, y-intercept = 3';
  } else if (keyPoints && keyPoints.length > 0) {
    // Use first key point as example
    const firstKeyPoint = keyPoints[0];
    if (firstKeyPoint.length < 60) {
      return `Example: ${firstKeyPoint}`;
    }
  }
  
  // Generic example if no specific match
  if (content && content.length > 20) {
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 15);
    if (sentences.length > 0) {
      return `Example: ${sentences[0].trim().substring(0, 55)}`;
    }
  }
  
  return null;
}

/**
 * Extract and format formulas/examples from content
 */
function extractFormulasAndExamples(content, title, keyPoints) {
  // If no content, try to generate content from title and key points
  if (!content || content.trim().length < 10) {
    // Build content from available information
    let generatedContent = '';
    if (title) {
      generatedContent = `This section covers ${title}.`;
    }
    if (keyPoints && keyPoints.length > 0) {
      generatedContent += ' ' + keyPoints.slice(0, 3).join('. ') + '.';
    }
    
    // Try to generate example
    const generatedExample = generateExample(title, generatedContent, keyPoints);
    return { 
      text: generatedContent || title || 'Learning Material', 
      formulas: [], 
      examples: generatedExample ? [generatedExample] : [] 
    };
  }
  
  const formulas = [];
  const examples = [];
  let text = content;
  
  // More aggressive pattern matching for examples
  const examplePatterns = [
    /(Example\s*\d*[:\-]?\s*[^\.!?]+[\.!?])/gi, // Example: ... or Example 1: ...
    /(For example[:\-]?\s*[^\.!?]+[\.!?])/gi, // For example: ...
    /(e\.g\.\s*[^\.!?]+[\.!?])/gi, // e.g. ...
    /(such as\s+[^\.!?]+[\.!?])/gi, // such as ...
    /(like\s+[^\.!?]+[\.!?])/gi, // like ...
    /(Consider\s+[^\.!?]+[\.!?])/gi, // Consider ...
    /(Let's\s+[^\.!?]+[\.!?])/gi, // Let's ...
  ];
  
  // Look for common formula patterns: =, equations, math expressions
  const formulaPatterns = [
    /([a-zA-Z0-9\s\+\-\*\/\(\)\^=]+=[a-zA-Z0-9\s\+\-\*\/\(\)\^]+)/g, // Basic equations
    /([a-zA-Z]\([^)]+\)\s*=[^\.]+)/g, // Functions like f(x) = ...
    /([a-zA-Z]+\s*=\s*[a-zA-Z0-9\s\+\-\*\/\(\)\^]+)/g, // Variable = expression
  ];
  
  // Extract examples first (more specific patterns)
  examplePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim();
        if (cleaned.length > 10 && cleaned.length < 80) {
          examples.push(cleaned);
        }
      });
    }
  });
  
  // Extract formulas
  formulaPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim();
        if (cleaned.includes('=') && cleaned.length > 3 && cleaned.length < 50) {
          formulas.push(cleaned);
        }
      });
    }
  });
  
  // Remove formulas and examples from main text to avoid duplication
  formulas.forEach(formula => {
    text = text.replace(formula, '');
  });
  examples.forEach(example => {
    text = text.replace(example, '');
  });
  
  // If no examples found, ALWAYS generate one
  if (examples.length === 0) {
    const generatedExample = generateExample(title, content, keyPoints);
    if (generatedExample) {
      examples.push(generatedExample);
    } else {
      // Fallback: create a generic example from key points or content
      if (keyPoints && keyPoints.length > 0) {
        examples.push(`Example: ${keyPoints[0]}`);
      } else if (content && content.length > 15) {
        const firstSentence = content.split(/[.!?]/)[0].trim();
        if (firstSentence.length > 10 && firstSentence.length < 60) {
          examples.push(`Example: ${firstSentence}`);
        }
      }
    }
  }
  
  // If no formulas but content has math-like content, try to extract
  if (formulas.length === 0) {
    // Look for simple equations in the text
    const simpleEq = content.match(/(\d+\s*[+\-*/]\s*\d+\s*=\s*\d+)/);
    if (simpleEq) {
      formulas.push(simpleEq[0]);
    } else if (content.match(/[+\-*/=()]/)) {
      // Try to extract any equation-like pattern
      const eqPattern = content.match(/([a-zA-Z0-9\s]+\s*=\s*[a-zA-Z0-9\s\+\-\*\/\(\)]+)/);
      if (eqPattern && eqPattern[0].length < 50) {
        formulas.push(eqPattern[0].trim());
      }
    }
    
    // If still no formulas and we have a math-related topic, generate one
    if (formulas.length === 0) {
      const mathTopic = (title + ' ' + content).toLowerCase();
      if (mathTopic.includes('algebra') || mathTopic.includes('equation') || mathTopic.includes('solve')) {
        formulas.push('x + y = z');
      } else if (mathTopic.includes('area') || mathTopic.includes('perimeter')) {
        formulas.push('Area = length × width');
      } else if (mathTopic.includes('percentage') || mathTopic.includes('percent')) {
        formulas.push('Percentage = (Part / Whole) × 100');
      }
    }
  }
  
  // Ensure text is not empty
  if (!text || text.trim().length < 5) {
    if (title) {
      text = `This section covers ${title}.`;
    } else if (keyPoints && keyPoints.length > 0) {
      text = keyPoints.slice(0, 2).join('. ') + '.';
    } else {
      text = 'Learning Material';
    }
  }
  
  return {
    text: text.trim(),
    formulas: formulas.slice(0, 3), // Increased to 3 formulas per slide
    examples: examples.slice(0, 3) // Increased to 3 examples per slide
  };
}

/**
 * Split text into lines that fit on screen (max ~60 characters per line)
 * Improved to not cut off mid-sentence
 */
function splitTextIntoLines(text, maxChars = 60) {
  if (!text) return [];
  
  // First, split by sentences to avoid cutting mid-sentence
  const sentences = text.split(/([.!?]\s+)/).filter(s => s.trim().length > 0);
  const lines = [];
  let currentLine = '';
  
  sentences.forEach(sentence => {
    const trimmedSentence = sentence.trim();
    
    // If sentence fits on current line, add it
    if (currentLine && (currentLine + ' ' + trimmedSentence).length <= maxChars) {
      currentLine = currentLine + ' ' + trimmedSentence;
    } 
    // If sentence alone fits, start new line
    else if (trimmedSentence.length <= maxChars) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = trimmedSentence;
    }
    // If sentence is too long, split it by words
    else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      
      const words = trimmedSentence.split(' ');
      words.forEach(word => {
        if ((currentLine + ' ' + word).length <= maxChars) {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
        }
      });
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.slice(0, 6); // Increased to 6 lines to show more content
}

/**
 * Get color scheme based on slide type and index
 */
function getColorScheme(slideType, index) {
  const schemes = [
    // Vibrant gradients
    { bg1: '0x667eea', bg2: '0x764ba2', accent: 'white' }, // Purple
    { bg1: '0xf093fb', bg2: '0xf5576c', accent: 'white' }, // Pink-Red
    { bg1: '0x4facfe', bg2: '0x00f2fe', accent: 'white' }, // Blue-Cyan
    { bg1: '0x43e97b', bg2: '0x38f9d7', accent: 'black' }, // Green-Cyan
    { bg1: '0xfa709a', bg2: '0xfee140', accent: 'white' }, // Pink-Yellow
    { bg1: '0x30cfd0', bg2: '0x330867', accent: 'white' }, // Teal-Purple
    { bg1: '0xa8edea', bg2: '0xfed6e3', accent: 'black' }, // Light Blue-Pink
    { bg1: '0xff9a9e', bg2: '0xfecfef', accent: 'white' }, // Coral-Pink
  ];
  
  // Use different schemes based on slide type
  if (slideType === 'title') {
    return schemes[0]; // Purple for title
  } else if (slideType === 'summary') {
    return schemes[5]; // Teal-Purple for summary
  } else {
    // Rotate through schemes for content slides
    return schemes[index % schemes.length];
  }
}

/**
 * Fallback: Create entertaining slide image using ImageMagick, FFmpeg, or basic method
 */
async function createSimpleSlideImage(slideData, outputPath) {
  const slideType = slideData.type || 'content';
  const slideIndex = parseInt(slideData.index) || 0;
  const colorScheme = getColorScheme(slideType, slideIndex);
  
  // Extract formulas and examples from content
  const { text, formulas, examples } = extractFormulasAndExamples(
    slideData.content || '', 
    slideData.title || '',
    slideData.keyPoints || slideData.keyConcepts || []
  );
  const title = (slideData.title || 'Slide').substring(0, 60); // Shorter title for better fit
  
  // Log for debugging
  if (examples.length > 0) {
    console.log(`📝 Found ${examples.length} example(s) for slide: ${title}`);
  }
  if (formulas.length > 0) {
    console.log(`🔢 Found ${formulas.length} formula(s) for slide: ${title}`);
  }
  
  // Try ImageMagick convert command first (with gradient, formulas, and multi-line text)
  try {
    const bg1Color = `#${colorScheme.bg1.substring(2)}`;
    const bg2Color = `#${colorScheme.bg2.substring(2)}`;
    const textColor = colorScheme.accent === 'white' ? 'white' : 'black';
    
    // Build ImageMagick command with multiple text annotations
    let annotateCmd = `convert -size 1920x1080 gradient:"${bg1Color}-${bg2Color}"`;
    
    // Title (centered, top)
    annotateCmd += ` -gravity center -pointsize 72 -fill ${textColor} -font Arial-Bold -annotate +0-350 "${title.replace(/"/g, '\\"')}"`;
    
    // Main text (centered, split into lines)
    const textLines = splitTextIntoLines(text, 50);
    textLines.forEach((line, index) => {
      annotateCmd += ` -pointsize 44 -fill ${textColor} -annotate +0-${200 - (index * 60)} "${line.replace(/"/g, '\\"')}"`;
    });
    
    // Formulas (centered, larger font, highlighted)
    // Split long formulas into multiple lines if needed
    formulas.forEach((formula, index) => {
      // Split formula if too long (don't truncate)
      const formulaLines = splitTextIntoLines(formula, 45);
      formulaLines.forEach((line, lineIndex) => {
        const yOffset = 50 + (index * 80) + (lineIndex * 60);
        // Don't truncate - show full formula
        annotateCmd += ` -pointsize 52 -fill ${textColor} -font Arial-Bold -annotate +0+${yOffset} "${line.replace(/"/g, '\\"')}"`;
      });
    });
    
    // Examples (centered, below formulas, or after text if no formulas)
    // Split long examples into multiple lines to avoid truncation
    if (examples.length > 0) {
      const baseOffset = formulas.length > 0 ? 150 + (formulas.length * 80) : 50 + (textLines.length * 60);
      examples.forEach((example, index) => {
        // Split example into lines if too long (don't truncate)
        const exampleLines = splitTextIntoLines(example, 55);
        exampleLines.forEach((line, lineIndex) => {
          const yOffset = baseOffset + (index * 70) + (lineIndex * 50);
          // Don't truncate - show full text
          annotateCmd += ` -pointsize 44 -fill ${textColor} -font Arial-Bold -annotate +0+${yOffset} "${line.replace(/"/g, '\\"')}"`;
        });
      });
    }
    
    annotateCmd += ` "${outputPath}"`;
    
    await execAsync(annotateCmd, {
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true
    });
    
    // Verify the image was created
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return;
    }
  } catch (error) {
    // ImageMagick not available, try FFmpeg
  }
  
  // Try using FFmpeg to create slide with formulas and centered text
  try {
    const ffmpegPath = getFFmpegPath();
    const bgColor = colorScheme.bg1;
    
    // Build FFmpeg drawtext filters for centered text
    const textFilters = [];
    let yPosition = 200; // Start position
    
    // Title (centered, top, larger)
    const escapedTitle = title.replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    textFilters.push(`drawtext=text='${escapedTitle}':fontsize=72:fontcolor=${colorScheme.accent}:x=(w-text_w)/2:y=${yPosition}:shadowcolor=black@0.6:shadowx=3:shadowy=3`);
    
    // Main text lines (centered)
    const textLines = splitTextIntoLines(text, 45);
    textLines.forEach((line, index) => {
      yPosition = 320 + (index * 55);
      const escapedLine = line.replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      textFilters.push(`drawtext=text='${escapedLine}':fontsize=42:fontcolor=${colorScheme.accent}:x=(w-text_w)/2:y=${yPosition}:shadowcolor=black@0.5:shadowx=2:shadowy=2`);
    });
    
    // Formulas (centered, larger, bold) - split into lines if needed
    formulas.forEach((formula, index) => {
      const formulaLines = splitTextIntoLines(formula, 45);
      formulaLines.forEach((line, lineIndex) => {
        yPosition = 550 + (index * 80) + (lineIndex * 65);
        const escapedFormula = line.replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
        textFilters.push(`drawtext=text='${escapedFormula}':fontsize=56:fontcolor=${colorScheme.accent}:x=(w-text_w)/2:y=${yPosition}:shadowcolor=black@0.7:shadowx=4:shadowy=4`);
      });
    });
    
    // Examples (centered, below formulas, or after text if no formulas)
    // Split long examples into multiple lines to avoid truncation
    if (examples.length > 0) {
      // Calculate base Y position accounting for all formula lines
      let formulaHeight = 0;
      formulas.forEach(formula => {
        const formulaLines = splitTextIntoLines(formula, 45);
        formulaHeight += formulaLines.length * 65;
      });
      const baseY = formulas.length > 0 ? 750 + formulaHeight : 550 + (textLines.length * 55);
      
      examples.forEach((example, index) => {
        // Split example into lines if too long (don't truncate)
        const exampleLines = splitTextIntoLines(example, 55);
        exampleLines.forEach((line, lineIndex) => {
          yPosition = baseY + (index * 70) + (lineIndex * 55);
          const escapedExample = line.replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
          // Don't truncate - show full example text
          textFilters.push(`drawtext=text='${escapedExample}':fontsize=42:fontcolor=${colorScheme.accent}:x=(w-text_w)/2:y=${yPosition}:shadowcolor=black@0.6:shadowx=3:shadowy=3`);
        });
      });
    }
    
    // If no content, show title and generate content
    if (textFilters.length === 0 || (textLines.length === 0 && formulas.length === 0 && examples.length === 0)) {
      // Show title prominently
      textFilters.push(`drawtext=text='${escapedTitle}':fontsize=72:fontcolor=${colorScheme.accent}:x=(w-text_w)/2:y=300:shadowcolor=black@0.6:shadowx=3:shadowy=3`);
      
      // Add key points if available
      if (slideData.keyPoints && slideData.keyPoints.length > 0) {
        slideData.keyPoints.slice(0, 3).forEach((point, index) => {
          const yPos = 450 + (index * 60);
          const escapedPoint = point.substring(0, 50).replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
          textFilters.push(`drawtext=text='• ${escapedPoint}':fontsize=40:fontcolor=${colorScheme.accent}:x=(w-text_w)/2:y=${yPos}:shadowcolor=black@0.5:shadowx=2:shadowy=2`);
        });
      } else {
        // Generate a generic informative message
        const infoText = 'This section contains important learning material.';
        const escapedInfo = infoText.replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/"/g, '\\"');
        textFilters.push(`drawtext=text='${escapedInfo}':fontsize=44:fontcolor=${colorScheme.accent}:x=(w-text_w)/2:y=450:shadowcolor=black@0.5:shadowx=2:shadowy=2`);
      }
    }
    
    const ffmpegCmd = `"${ffmpegPath}" -f lavfi -i color=c=${bgColor}:s=1920x1080:d=1 -vf "${textFilters.join(',')}" -frames:v 1 -y "${outputPath}"`;
    
    await execAsync(ffmpegCmd, {
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true
    });
    
    // Verify the image was created
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return;
    }
  } catch (error) {
    // FFmpeg failed, try minimal version
    try {
      const ffmpegPath = getFFmpegPath();
      const bgColor = colorScheme.bg1;
      const escapedTitle = title.replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      
      // Minimal centered title
      const simpleCmd = `"${ffmpegPath}" -f lavfi -i color=c=${bgColor}:s=1920x1080:d=1 -vf "drawtext=text='${escapedTitle}':fontsize=72:fontcolor=${colorScheme.accent}:x=(w-text_w)/2:y=(h-text_h)/2" -frames:v 1 -y "${outputPath}"`;
      
      await execAsync(simpleCmd, {
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      });
      
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return;
      }
    } catch (error2) {
      // FFmpeg also failed
    }
  }
  
  // Final fallback: create a minimal valid PNG (1x1 pixel, colored)
  // FFmpeg will scale it to full size when creating the video
  const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(outputPath, minimalPng);
}

/**
 * Combine slides and audio into final video using ffmpeg
 */
async function combineSlidesAndAudio(slides, audioPath, tempDir, subject, topic) {
  return new Promise(async (resolve, reject) => {
    try {
      // Output video path
      const safeSubject = (subject || 'content').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const safeTopic = (topic || 'topic').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const timestamp = Date.now();
      const videoFilename = `video_${safeSubject}_${safeTopic}_${timestamp}.mp4`;
      const videoPath = path.join(process.cwd(), 'uploads', videoFilename);
      
      // Get audio duration first
      const ffmpegPath = getFFmpegPath();
      const ffprobePath = getFFprobePath();
      
      let audioDuration;
      try {
        if (ffmpeg && ffmpeg !== false) {
          // Use fluent-ffmpeg to get audio duration
          await new Promise((resolveProbe, rejectProbe) => {
            ffmpeg.ffprobe(audioPath, (err, metadata) => {
              if (err) {
                rejectProbe(err);
                return;
              }
              audioDuration = metadata.format.duration || 10;
              console.log(`🎵 Audio duration: ${audioDuration.toFixed(2)} seconds`);
              resolveProbe();
            });
          });
        } else {
          // Use exec to get audio duration
          const { stdout: durationOutput } = await execAsync(`"${ffprobePath}" -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`);
          audioDuration = parseFloat(durationOutput.trim()) || 10;
          console.log(`🎵 Audio duration: ${audioDuration.toFixed(2)} seconds`);
        }
      } catch (error) {
        console.warn('⚠️ Could not get audio duration, using default:', error.message);
        audioDuration = 10; // Default fallback
      }
      
      // Calculate duration per slide (distribute evenly across audio duration)
      const durationPerSlide = audioDuration / Math.max(slides.length, 1);
      console.log(`📊 ${slides.length} slides, ${durationPerSlide.toFixed(2)} seconds per slide`);
      
      // Use exec directly for better control over multiple inputs with different options
      // This is more reliable than fluent-ffmpeg for this use case
      createVideoWithExec(slides, audioPath, videoPath, audioDuration)
        .then(resolve)
        .catch((error) => {
          console.warn('⚠️ Exec approach failed, trying fluent-ffmpeg fallback:', error.message);
          // Fallback: try fluent-ffmpeg if available
          if (ffmpeg && ffmpeg !== false) {
            createVideoSimple(slides, audioPath, videoPath, audioDuration)
              .then(resolve)
              .catch(reject);
          } else {
            reject(error);
          }
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create video using exec directly (fallback when fluent-ffmpeg not available)
 */
async function createVideoWithExec(slides, audioPath, outputPath, audioDuration) {
  const ffmpegPath = getFFmpegPath();
  
  // Use the provided audio duration or calculate it
  let duration = audioDuration;
  if (!duration) {
    try {
      const ffprobePath = getFFprobePath();
      const { stdout: durationOutput } = await execAsync(`"${ffprobePath}" -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`);
      duration = parseFloat(durationOutput.trim()) || 10;
    } catch (error) {
      duration = 10;
    }
  }
  
  console.log(`📹 Creating video with ${slides.length} slides, duration: ${duration.toFixed(2)}s`);
  
  // If only one slide, use simple approach
  if (slides.length === 1) {
    const firstSlide = slides[0].path;
    await execAsync(`"${ffmpegPath}" -loop 1 -i "${firstSlide}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t ${duration} -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" "${outputPath}"`);
    return outputPath;
  }
  
  // For multiple slides, create a filter complex with smooth fade transitions
  const durationPerSlide = duration / slides.length;
  const transitionDuration = 0.3; // 0.3 seconds for smooth fade transition
  
  // Build input arguments for each slide (extend duration slightly for transitions)
  const inputArgs = slides.map(slide => `-loop 1 -t ${durationPerSlide + transitionDuration} -i "${slide.path}"`).join(' ');
  
  // Scale and pad each slide, then apply fade effects
  const scaleFilters = slides.map((slide, index) => {
    const slideStart = index * durationPerSlide;
    const slideEnd = slideStart + durationPerSlide;
    
    // Apply fade in at start (except first slide which fades in from beginning)
    // Apply fade out at end (except last slide)
    let fadeFilters = [];
    
    if (index === 0) {
      // First slide: fade in at start
      fadeFilters.push(`fade=t=in:st=0:d=${transitionDuration}`);
    }
    
    if (index === slides.length - 1) {
      // Last slide: fade out at end
      fadeFilters.push(`fade=t=out:st=${durationPerSlide - transitionDuration}:d=${transitionDuration}`);
    } else {
      // Middle slides: fade out before next slide starts
      fadeFilters.push(`fade=t=out:st=${durationPerSlide - transitionDuration}:d=${transitionDuration}`);
    }
    
    const fadeFilter = fadeFilters.length > 0 ? `,${fadeFilters.join(',')}` : '';
    return `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS,fps=30${fadeFilter}[v${index}]`;
  }).join(';');
  
  // Concat all slides with transitions
  const concatInputs = slides.map((slide, index) => `[v${index}]`).join('');
  const filterComplex = `${scaleFilters};${concatInputs}concat=n=${slides.length}:v=1:a=0[outv]`;
  
  const command = `"${ffmpegPath}" ${inputArgs} -i "${audioPath}" -filter_complex "${filterComplex}" -map "[outv]" -map ${slides.length}:a -c:v libx264 -c:a aac -t ${duration} -pix_fmt yuv420p "${outputPath}"`;
  
  await execAsync(command, {
    maxBuffer: 50 * 1024 * 1024 // 50MB buffer for complex commands
  });
  
  return outputPath;
}

/**
 * Simple video creation fallback
 */
async function createVideoSimple(slides, audioPath, outputPath, audioDuration) {
  // Create a simple video by showing slides for audio duration
  if (ffmpeg && ffmpeg !== false) {
    return new Promise((resolve, reject) => {
      const ffmpegPath = getFFmpegPath();
      const ffprobePath = getFFprobePath();
      
      // Use provided duration or get it
      let duration = audioDuration;
      
      if (!duration) {
        // Get audio duration
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }
          duration = metadata.format.duration || 10;
          createVideoWithFluentFFmpeg(slides, audioPath, outputPath, duration, ffmpegPath, ffprobePath)
            .then(resolve)
            .catch(reject);
        });
      } else {
        createVideoWithFluentFFmpeg(slides, audioPath, outputPath, duration, ffmpegPath, ffprobePath)
          .then(resolve)
          .catch(reject);
      }
    });
  } else {
    // Use exec directly
    return createVideoWithExec(slides, audioPath, outputPath, audioDuration);
  }
}

/**
 * Helper to create video with fluent-ffmpeg
 */
async function createVideoWithFluentFFmpeg(slides, audioPath, outputPath, duration, ffmpegPath, ffprobePath) {
  return new Promise((resolve, reject) => {
    const durationPerSlide = duration / Math.max(slides.length, 1);
    
    if (slides.length === 1) {
      // Single slide - simple approach
      const firstSlide = slides[0].path;
      let command = ffmpeg(firstSlide);
      
      if (ffmpegPath !== 'ffmpeg' && ffmpegPath.includes(path.sep)) {
        command.setFfmpegPath(ffmpegPath);
      }
      if (ffprobePath !== 'ffprobe' && ffprobePath.includes(path.sep)) {
        command.setFfprobePath(ffprobePath);
      }
      
      command
        .input(audioPath)
        .inputOptions(['-loop', '1'])
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-t', duration.toString()])
        .outputOptions(['-pix_fmt', 'yuv420p'])
        .size('1920x1080')
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    } else {
      // Multiple slides - need filter complex
      let command = ffmpeg();
      
      if (ffmpegPath !== 'ffmpeg' && ffmpegPath.includes(path.sep)) {
        command.setFfmpegPath(ffmpegPath);
      }
      if (ffprobePath !== 'ffprobe' && ffprobePath.includes(path.sep)) {
        command.setFfprobePath(ffprobePath);
      }
      
      // Add all slides as inputs
      slides.forEach((slide) => {
        command = command.input(slide.path);
      });
      
      // Add audio
      command = command.input(audioPath);
      
      // Create filter complex
      const scaleFilters = slides.map((slide, index) => 
        `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS,fps=30[v${index}]`
      ).join(';');
      
      const concatInputs = slides.map((slide, index) => `[v${index}]`).join('');
      const concatFilter = `${concatInputs}concat=n=${slides.length}:v=1:a=0:unsafe=1[outv]`;
      const filterComplex = `${scaleFilters};${concatFilter}`;
      
      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map [outv]',
          `-map ${slides.length}:a`,
          '-c:v libx264',
          '-c:a aac',
          '-t', duration.toString(),
          '-pix_fmt yuv420p'
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    }
  });
}

/**
 * Download file from URL
 */
async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles(tempDir) {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Warning: Could not clean up temp files:', error.message);
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

