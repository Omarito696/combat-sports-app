import { supabase, isSimulation } from './supabaseClient';
import { readAiResponse } from './aiResponse';

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
  return readAiResponse(response);
}
