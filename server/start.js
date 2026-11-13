import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { createAiServer, createLocalCompletion } from './ai.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...loadEnv('development', root, ''), ...process.env };
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10_000) }) },
});
const apiKey = readFileSync(new URL('../.local-ai/runtime-key', import.meta.url), 'utf8').trim();
const server = createAiServer({
  async verifyUser(token) {
    const { data, error } = await client.auth.getUser(token);
    return error ? null : data.user;
  },
  complete: createLocalCompletion({ baseUrl: 'http://127.0.0.1:8081/v1', apiKey }),
});
server.requestTimeout = 70_000;
server.headersTimeout = 10_000;
server.listen(3001, '127.0.0.1', () => console.log('Authenticated local AI gateway ready.'));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
