import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY, // reads from .env
});

export default genAI;