import 'dotenv/config';
import { generateVisualContent } from './ai-content-service.js';

async function test() {
  const content = await generateVisualContent(
    'Math',
    'Pythagorean Theorem',
    'Easy',
    'High school student'
  );

  console.log('Generated visual content:');
  console.log(content);
}

test();