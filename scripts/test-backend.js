import { randomUUID } from 'node:crypto';
import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const env = { ...loadEnv('development', process.cwd(), 'VITE_'), ...process.env };
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key?.startsWith('sb_publishable_')) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.');
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const testRunId = randomUUID();
  const row = { id: 1, message: 'Backend connection test', test_run_id: testRunId, checked_at: new Date().toISOString() };
  const { error: writeError } = await client.from('backend_check').upsert(row, { onConflict: 'id' });
  if (writeError) throw new Error(`Save failed: ${writeError.message}`);
  console.log('Saved test row to Supabase.');
  // Separate request ensures this actually tests a database read.
  const { data, error: readError } = await client.from('backend_check').select('*').eq('id', 1).single();
  if (readError) throw new Error(`Read failed: ${readError.message}`);
  if (data.test_run_id !== testRunId || data.message !== row.message) {
    throw new Error('Read-back mismatch. Another check may be running; try again.');
  }
  console.log('PASS: saved and read back the same test row.');
  console.log(JSON.stringify(data, null, 2));
  console.log('View it in Supabase Table Editor → backend_check. Rerunning replaces this one diagnostic row.');
}
main().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
