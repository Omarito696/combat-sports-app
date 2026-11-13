import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync, openSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const runtime = '.local-ai/runtime/llama-b12363/llama-server';
const model = '.local-ai/models/Qwen3-4B-Q4_K_M.gguf';
if (!existsSync(runtime) || !existsSync(model)) {
  console.error('Local AI files are missing. Run npm run setup:ai first.');
  process.exit(1);
}
mkdirSync('.local-ai', { recursive: true });
for (const port of [8081, 3001, 5180]) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`Port ${port} is already in use. Stop the previous FightTracker session before starting another.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}
if (!existsSync('.local-ai/runtime-key')) writeFileSync('.local-ai/runtime-key', randomBytes(32).toString('hex'), { mode: 0o600 });
chmodSync('.local-ai/runtime-key', 0o600);
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => { for (const child of children) child.kill('SIGKILL'); process.exit(code); }, 2000).unref();
  process.exitCode = code;
}
function start(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) { console.error(`A local service stopped (${code ?? 'signal'}).`); stop(1); } });
  return child;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
const log = openSync('.local-ai/runtime.log', 'a', 0o600);
const device = process.env.FIGHTTRACKER_GPU === '1' ? ['--n-gpu-layers', '99'] : ['--device', 'none', '--n-gpu-layers', '0', '--fit', 'off'];
start(runtime, ['--model', model, '--alias', 'fighttracker-local', '--host', '127.0.0.1', '--port', '8081', '--ctx-size', '4096', '--parallel', '1', ...device, '--api-key-file', '.local-ai/runtime-key', '--no-webui', '--no-slots', '--reasoning', 'off', '--log-disable'], { stdio: ['ignore', log, log] });
console.log('Loading Qwen3-4B locally. The first start may take a minute.');
let ready = false;
for (let i = 0; i < 120 && !stopping; i++) {
  try {
    const response = await fetch('http://127.0.0.1:8081/v1/models', { headers: { Authorization: `Bearer ${readFileSync('.local-ai/runtime-key', 'utf8').trim()}` }, signal: AbortSignal.timeout(1000) });
    if (response.ok) { ready = true; break; }
  } catch { /* The runtime is still loading. */ }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
if (!ready) { console.error('AI could not start. See .local-ai/runtime.log.'); stop(1); }
else if (!stopping) {
  start(process.execPath, ['server/start.js']);
  start(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5180', '--strictPort']);
}
