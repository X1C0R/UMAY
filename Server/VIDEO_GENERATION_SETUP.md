# Video Generation Setup Guide

## Overview
This system converts text content into video tutorials programmatically using:
- **Text-to-Speech (TTS)** for narration
- **Canvas** for creating slides with text/images
- **FFmpeg** for combining slides and audio into video

## Prerequisites

### 1. Install FFmpeg
FFmpeg must be installed on your system:

**Windows:**
```bash
# Download from https://ffmpeg.org/download.html
# Or use chocolatey:
choco install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
# or
sudo yum install ffmpeg
```

### 2. Install Node.js Dependencies
```bash
npm install
```

This will install:
- `canvas` - For creating slide images
- `fluent-ffmpeg` - For video processing
- `node-fetch` - For downloading files

### 3. System Dependencies for Canvas
Canvas requires system libraries:

**Windows:**
- Install Visual Studio Build Tools
- Or use pre-built binaries (usually works automatically)

**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

**Linux:**
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

## How It Works

### 1. Text Content → Video
When text content is generated:
1. **Extract text** from content (title, sections, summary)
2. **Generate TTS audio** from the text
3. **Create slides** for each section using Canvas
4. **Combine** slides + audio into MP4 video using FFmpeg

### 2. Visual Content → Video
When visual content is generated:
1. **Extract descriptions** from visual elements
2. **Generate TTS audio** from descriptions
3. **Create slides** with images and text
4. **Combine** into video

## Usage

### Generate Video from Content
```javascript
import { generateVideoFromText } from './video-generation-service.js';

const videoUrl = await generateVideoFromText(content, subject, topic);
// Returns: "/uploads/video_subject_topic_timestamp.mp4"
```

### Integration with Content Generation
Videos are automatically generated for:
- **Text learning** content
- **Visual learning** content (with images)

## Video Specifications
- **Resolution**: 1920x1080 (Full HD)
- **Format**: MP4 (H.264 video, AAC audio)
- **Slide Duration**: 5 seconds per slide
- **Background**: Gradient (purple to blue)

## File Structure
```
uploads/
  ├── video_subject_topic_timestamp.mp4  (Final video)
  ├── audio/
  │   └── tts_*.mp3  (TTS audio files)
  └── temp_*/  (Temporary files, auto-cleaned)
```

## Troubleshooting

### FFmpeg Not Found
```bash
# Check if ffmpeg is installed
ffmpeg -version

# If not found, install it (see Prerequisites)
```

### Canvas Installation Issues
```bash
# Try rebuilding canvas
npm rebuild canvas

# Or install system dependencies (see Prerequisites)
```

### Video Generation Fails
- Check server logs for specific errors
- Ensure `uploads/` directory is writable
- Verify FFmpeg is working: `ffmpeg -version`
- Check disk space (videos can be large)

## Frontend Integration

Videos are served from `/uploads/` and can be displayed using:
- React Native `Video` component (expo-av)
- HTML5 `<video>` tag (web)

Example:
```jsx
<Video
  source={{ uri: `${API_URL}${videoUrl}` }}
  style={styles.video}
  useNativeControls
/>
```


