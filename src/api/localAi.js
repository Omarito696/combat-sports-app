import { supabase, isSimulation } from './supabaseClient';

export async function askLocalAi(question) {
  if (isSimulation) throw new Error('Sign in to the real app to use the local assistant.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in to ask a question.');
  const response = await fetch('/api/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ question }),
    signal: AbortSignal.timeout(65_000),
  });
  const result = await response.json().catch(() => ({ error: 'Start the local assistant with npm run dev:full.' }));
  if (!response.ok) throw new Error(result.error || 'The assistant is unavailable.');
  return result;
}
