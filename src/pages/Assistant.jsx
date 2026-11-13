import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { askLocalAi } from '@/api/localAi';

const examples = ['How does MMA scoring work?', 'What is the difference between wrestling and BJJ?', 'Explain a unanimous decision.'];

export default function Assistant() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try { setResult(await askLocalAi(question)); }
    catch (err) { setError(err.name === 'TimeoutError' ? 'That answer took too long. Please try again.' : err.message); }
    finally { setLoading(false); }
  }
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3"><MessageCircle className="text-primary" /> Ask FightTracker</h1>
        <p className="text-muted-foreground mt-2">Understand combat sports rules, scoring and terminology.</p>
      </div>
      <p className="text-sm rounded-xl border border-border bg-card p-4">Answers run on this computer. The assistant has no live news or web access and can make mistakes. Answers are kept separate from verified sports records.</p>
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="ai-question" className="text-sm font-medium">Your question</label>
        <Textarea id="ai-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={2000} required rows={4} placeholder="How is a round scored in MMA?" disabled={loading} />
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs text-muted-foreground">{question.length}/2,000 · Up to 10 questions per minute</span>
          <Button type="submit" disabled={loading || !question.trim()}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? 'Thinking…' : 'Ask'}</Button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2">{examples.map(example => <button key={example} type="button" disabled={loading} onClick={() => setQuestion(example)} className="text-xs rounded-full border border-border px-3 py-2 hover:bg-accent">{example}</button>)}</div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {result && <section aria-live="polite" className="rounded-xl border border-border bg-card p-5 space-y-3"><p className="text-xs font-semibold text-primary">AI-generated explanation · {result.model}</p><p className="whitespace-pre-wrap leading-relaxed">{result.answer}</p></section>}
    </div>
  );
}
