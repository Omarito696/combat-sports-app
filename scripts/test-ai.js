import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createLocalCompletion } from '../server/ai.js';

const apiKey = readFileSync(fileURLToPath(new URL('../.local-ai/runtime-key', import.meta.url)), 'utf8').trim();
const complete = createLocalCompletion({ baseUrl: 'http://127.0.0.1:8081/v1', apiKey });
const answer = await complete('In one short sentence, what does a unanimous decision mean in combat sports?', AbortSignal.timeout(60_000));
console.log('PASS: local model returned an answer:');
console.log(answer);
const response = await fetch('http://127.0.0.1:3001/api/ai/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'Test' }) });
if (response.status !== 401) throw new Error('Gateway allowed a request without sign-in');
console.log('PASS: gateway rejects requests without sign-in.');
