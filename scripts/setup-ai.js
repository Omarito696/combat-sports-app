import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { rename, rm, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('This installer is pinned for Apple Silicon Macs. See LOCAL_SETUP.md for other systems.');
mkdirSync('.local-ai/runtime', { recursive: true });
mkdirSync('.local-ai/models', { recursive: true });
async function digest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
async function download(url, path, expected) {
  if (existsSync(path) && await digest(path) === expected) return;
  console.log(`Downloading ${path}. This may take several minutes.`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  await pipeline(response.body, createWriteStream(`${path}.part`));
  if (await digest(`${path}.part`) !== expected) { await rm(`${path}.part`); throw new Error('Checksum mismatch; download rejected.'); }
  await rename(`${path}.part`, path);
}
await download('https://github.com/ggml-org/llama.cpp/releases/download/b12363/llama-b12363-bin-macos-arm64.tar.gz', '.local-ai/runtime.tar.gz', 'e9b053540ec7274bb127fcff5c80dd141fd1bba64d13696ec3abbd13ff1baf82');
execFileSync('tar', ['-xzf', '.local-ai/runtime.tar.gz', '-C', '.local-ai/runtime']);
await download('https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/bc640142c66e1fdd12af0bd68f40445458f3869b/Qwen3-4B-Q4_K_M.gguf', '.local-ai/models/Qwen3-4B-Q4_K_M.gguf', '7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5');
const license = await fetch('https://huggingface.co/Qwen/Qwen3-4B-GGUF/raw/bc640142c66e1fdd12af0bd68f40445458f3869b/LICENSE');
if (!license.ok) throw new Error('Could not download the model licence.');
await writeFile('.local-ai/models/LICENSE-Qwen.txt', await license.text());
console.log('Local AI installed and checksums verified. Start with npm run dev:full.');
