export async function readAiResponse(response) {
  let result;
  try { result = await response.json(); }
  catch { throw new Error('The assistant returned an invalid response. Start it with npm run dev:full and try again.'); }
  if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : 'The assistant is unavailable.');
  if (typeof result?.answer !== 'string' || !result.answer.trim() || result.generated !== true || typeof result.model !== 'string') {
    throw new Error('The assistant returned no usable answer. Please try again.');
  }
  return result;
}
