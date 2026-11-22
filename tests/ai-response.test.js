import test from 'node:test';
import assert from 'node:assert/strict';
import { readAiResponse } from '../src/api/aiResponse.js';

test('a successful HTML fallback or incomplete JSON is never shown as an empty AI answer', async () => {
  await assert.rejects(readAiResponse(new Response('<html>App fallback</html>')), /invalid response/);
  for (const body of [null, {}, { error: 'Oops' }, { answer: ' ', generated: true, model: 'Qwen' }]) {
    await assert.rejects(readAiResponse(Response.json(body)), /no usable answer/);
  }
  await assert.rejects(readAiResponse(Response.json({ error: 'Sign in again' }, { status: 401 })), /Sign in again/);
  const answer = { answer: 'An explanation', generated: true, model: 'Qwen' };
  assert.deepEqual(await readAiResponse(Response.json(answer)), answer);
});
