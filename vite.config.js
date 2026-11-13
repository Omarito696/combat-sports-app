import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local-ai/**'] },
    proxy: { '/api/ai': 'http://127.0.0.1:3001' },
  },
  preview: { proxy: { '/api/ai': 'http://127.0.0.1:3001' } },
});
