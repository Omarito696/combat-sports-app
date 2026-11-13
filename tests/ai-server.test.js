import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { createAiServer, createLocalCompletion } from '../server/ai.js';

async function fixture(t, options = {}) {
  const server = createAiServer({ verifyUser: async token => token.startsWith('valid-') ? { id: token } : null, complete: async () => 'An explanation.', ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api/ai/ask`;
  const ask = (question = 'What is MMA?', token = 'valid-a', extra = {}) => fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }, body: JSON.stringify({ question }),
  });
  ask.url = url;
  return ask;
}
test('AI requires a verified identity; a forged token never invokes the model', async t => {
  let calls = 0;
  const ask = await fixture(t, { complete: async () => { calls++; return 'Answer'; } });
  assert.equal((await ask('Hi', '')).status, 401);
  assert.equal((await ask('Hi', 'forged-token')).status, 401);
  assert.equal(calls, 0);
  const response = await ask();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.generated, true);
  assert.match(body.notice, /Not verified/);
});
test('rate limiting is per verified user and resets after one minute', async t => {
  let time = 0;
  const ask = await fixture(t, { now: () => time });
  for (let i = 0; i < 10; i++) assert.equal((await ask()).status, 200);
  const capped = await ask();
  assert.equal(capped.status, 429);
  assert.equal(capped.headers.get('retry-after'), '60');
  assert.equal((await ask('Hello', 'valid-b')).status, 200);
  time = 60_001;
  assert.equal((await ask()).status, 200);
});
test('rejects invalid questions, oversized payloads and foreign origins', async t => {
  const ask = await fixture(t);
  for (const question of ['', ' ', 123, 'a'.repeat(2001)]) assert.equal((await ask(question)).status, 400);
  assert.equal((await ask('a'.repeat(17000))).status, 413);
  assert.equal((await ask('Hi', 'valid-a', { Origin: 'https://evil.example' })).status, 403);
  const hostStatus = await new Promise((resolve, reject) => {
    const req = request(ask.url, { method: 'POST', headers: { Host: 'evil.example', 'Content-Type': 'application/json' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject);
    req.end('{"question":"Hi"}');
  });
  assert.equal(hostStatus, 403);
  assert.equal((await ask('Hi', 'valid-a', { 'Content-Type': 'text/plain' })).status, 415);
});
test('failed inference releases concurrency and returns a usable error', async t => {
  let calls = 0;
  const ask = await fixture(t, { complete: async () => { if (calls++ === 0) throw new Error('Private runtime detail'); return 'Recovered'; } });
  const response = await ask();
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /Private runtime/);
  assert.equal((await ask()).status, 200);
});
test('concurrent requests from one user cannot bypass the busy guard', async t => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const pending = new Promise(resolve => { release = resolve; });
  const ask = await fixture(t, { complete: async () => { entered(); await pending; return 'Done'; } });
  const first = ask();
  await started;
  assert.equal((await ask()).status, 429);
  release();
  assert.equal((await first).status, 200);
});
test('local completion caps output and never forwards client-supplied tools or browsing', async () => {
  let request;
  const complete = createLocalCompletion({ baseUrl: 'http://127.0.0.1:8081/v1', apiKey: 'test-only', fetchImpl: async (url, options) => { request = { url, ...options }; return { ok: true, json: async () => ({ choices: [{ message: { content: 'Hello' } }] }) }; } });
  assert.equal(await complete('Hi'), 'Hello');
  const body = JSON.parse(request.body);
  assert.equal(body.max_tokens, 384);
  assert.equal(body.messages.length, 2);
  assert.match(body.messages[0].content, /no web access/);
  assert.equal(body.tools, undefined);
});
