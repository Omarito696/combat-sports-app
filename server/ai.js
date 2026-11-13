import { createServer } from 'node:http';

export const SYSTEM_PROMPT = `You are FightTracker's helpful combat sports explainer. Answer briefly in plain English. Explain rules, scoring, terminology and the app. You have no web access or live sports feed. Do not invent current events, results, news, statistics, URLs or ratings. Say when you cannot verify a fact. Do not recommend bets or provide medical diagnosis. AI answers are explanations, never verified sports records.`;

export function createAiServer({ verifyUser, complete, now = Date.now }) {
  const windows = new Map();
  const activeUsers = new Set();
  let active = 0;
  function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end(JSON.stringify(body));
  }
  return createServer(async (req, res) => {
    // No CORS: requests go through the app's same-origin proxy, bound to loopback.
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) {
      return send(res, 403, { error: 'Host is not allowed.' });
    }
    if (req.headers.origin && !/^http:\/\/(localhost|127\.0\.0\.1):(5173|5174|5180|4173)$/.test(req.headers.origin)) {
      return send(res, 403, { error: 'Origin is not allowed.' });
    }
    if (req.method !== 'POST' || req.url !== '/api/ai/ask') return send(res, 404, { error: 'Not found.' });
    if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'Send JSON.' });
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token || token.length > 8192) return send(res, 401, { error: 'Sign in to ask a question.' });
    let user;
    try { user = await verifyUser(token); } catch { return send(res, 503, { error: 'Sign-in verification is temporarily unavailable.' }); }
    if (!user?.id) return send(res, 401, { error: 'Your session has expired. Please sign in again.' });
    const time = now();
    for (const [id, value] of windows) if (value.reset <= time) windows.delete(id);
    const window = windows.get(user.id) || { count: 0, reset: time + 60_000 };
    if (window.count >= 10) return send(res, 429, { error: 'Limit reached: 10 questions per minute. Try again shortly.' }, { 'Retry-After': String(Math.ceil((window.reset - time) / 1000)) });
    if (activeUsers.has(user.id) || active >= 2) return send(res, 429, { error: 'The assistant is busy. Please wait for the current answer.' }, { 'Retry-After': '5' });
    let body = '';
    try {
      for await (const chunk of req) {
        if (Buffer.byteLength(body) + chunk.length > 16_384) return send(res, 413, { error: 'Question is too large.' });
        body += chunk;
      }
      const data = JSON.parse(body);
      if (typeof data.question !== 'string' || !data.question.trim() || data.question.trim().length > 2000) {
        return send(res, 400, { error: 'Enter a question of 1–2,000 characters.' });
      }
      // Recheck after reading the body, since another request may have started.
      if (activeUsers.has(user.id) || active >= 2) return send(res, 429, { error: 'The assistant is busy. Try again shortly.' }, { 'Retry-After': '5' });
      window.count += 1;
      windows.set(user.id, window);
      activeUsers.add(user.id);
      active += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);
      const abort = () => { if (!res.writableEnded) controller.abort(); };
      res.on('close', abort);
      try {
        const answer = await complete(data.question.trim(), controller.signal);
        if (!res.destroyed) send(res, 200, { answer, generated: true, model: 'Qwen3-4B (local)', notice: 'AI explanation · No live web access · Not verified sports data' });
      } catch {
        if (!res.destroyed) send(res, 503, { error: 'The local AI is unavailable or took too long. Start it with npm run dev:full and try again.' });
      } finally {
        clearTimeout(timer);
        res.off('close', abort);
        activeUsers.delete(user.id);
        active -= 1;
      }
    } catch {
      send(res, 400, { error: 'Invalid JSON question.' });
    }
  });
}

export function createLocalCompletion({ baseUrl, apiKey, fetchImpl = fetch }) {
  return async (question, signal) => {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'fighttracker-local', messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: question }], max_tokens: 384, temperature: 0.4, stream: false, chat_template_kwargs: { enable_thinking: false } }),
    });
    if (!response.ok) throw new Error('Local AI request failed');
    const body = await response.json();
    const answer = body.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error('Local AI returned no answer');
    return answer;
  };
}
