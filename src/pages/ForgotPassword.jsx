import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Swords, Mail, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await base44.auth.resetPasswordRequest(email); } catch {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Swords className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sent ? 'Check your email for reset instructions' : "Enter your email to receive a reset link"}
          </p>
        </div>
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Reset Link
            </Button>
          </form>
        ) : (
          <p className="text-sm text-center text-muted-foreground">If an account exists with that email, you'll receive a reset link shortly.</p>
        )}
        <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}