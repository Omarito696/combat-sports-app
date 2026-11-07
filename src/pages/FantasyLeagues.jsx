import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Users, Trophy, Lock, Globe, Copy, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const LEAGUE_TYPE_STYLES = {
  private_league: { label: 'Private League', icon: Lock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  private_cup: { label: 'Private Cup', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  public_cup: { label: 'Public Cup', icon: Globe, color: 'text-green-400', bg: 'bg-green-500/10' },
  public_division: { label: 'Division', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
};

export default function FantasyLeagues() {
  const [view, setView] = useState('my'); // 'my' | 'create' | 'join' | 'public'
  const [createForm, setCreateForm] = useState({ name: '', type: 'private_league', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-leagues', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.LeagueMember.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const { data: allLeagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list('-created_date', 100),
  });

  const myLeagueIds = myMemberships.map(m => m.league_id);
  const myLeagues = allLeagues.filter(l => myLeagueIds.includes(l.id));
  const publicCups = allLeagues.filter(l => l.type === 'public_cup' && !myLeagueIds.includes(l.id));

  const createMutation = useMutation({
    mutationFn: async () => {
      const inviteCode = createForm.type.includes('private') ? generateCode() : undefined;
      const league = await base44.entities.League.create({
        ...createForm,
        invite_code: inviteCode,
        creator_id: currentUser.id,
        member_ids: [currentUser.id],
        season: '2026-S1',
        status: 'active',
      });
      await base44.entities.LeagueMember.create({
        league_id: league.id,
        user_id: currentUser.id,
        user_name: currentUser.full_name || currentUser.email,
      });
      return league;
    },
    onSuccess: (league) => {
      toast.success('League created!');
      if (league.invite_code) toast.success(`Invite code: ${league.invite_code}`, { duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      queryClient.invalidateQueries({ queryKey: ['my-leagues'] });
      setView('my');
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const league = allLeagues.find(l => l.invite_code === joinCode.toUpperCase());
      if (!league) throw new Error('Invalid invite code');
      await base44.entities.LeagueMember.create({
        league_id: league.id,
        user_id: currentUser.id,
        user_name: currentUser.full_name || currentUser.email,
      });
      return league;
    },
    onSuccess: () => {
      toast.success('Joined league!');
      queryClient.invalidateQueries({ queryKey: ['my-leagues'] });
      setView('my');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex items-center gap-3">
        <Link to="/fantasy" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Leagues & Cups</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
        {[
          { id: 'my', label: 'My Leagues' },
          { id: 'public', label: 'Public Cups' },
          { id: 'create', label: 'Create' },
          { id: 'join', label: 'Join' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setView(id)}
            className={cn("flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
              view === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {/* My Leagues */}
      {view === 'my' && (
        <div className="space-y-3">
          {myLeagues.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              You haven't joined any leagues yet.<br />
              <button onClick={() => setView('create')} className="text-primary mt-2 hover:underline">Create one</button> or{' '}
              <button onClick={() => setView('join')} className="text-primary hover:underline">join with a code</button>.
            </div>
          ) : myLeagues.map(league => <LeagueCard key={league.id} league={league} myMemberships={myMemberships} />)}
        </div>
      )}

      {/* Public Cups */}
      {view === 'public' && (
        <div className="space-y-3">
          {publicCups.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No public cups available right now.</div>
          ) : publicCups.map(league => <LeagueCard key={league.id} league={league} myMemberships={myMemberships} joinable currentUser={currentUser} />)}
        </div>
      )}

      {/* Create */}
      {view === 'create' && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-6 space-y-4 max-w-lg">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide">New League / Cup</h2>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="My Fight League" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} className="bg-muted/30 border-border/60" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'private_league', label: 'Private League', icon: Lock },
                { value: 'private_cup', label: 'Private Cup', icon: Trophy },
                { value: 'public_cup', label: 'Public Cup', icon: Globe },
              ].map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setCreateForm(f => ({ ...f, type: value }))}
                  className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                    createForm.type === value ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground")}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input placeholder="Brief description..." value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} className="bg-muted/30 border-border/60" />
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!createForm.name || createMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Creating...</span> : 'Create League'}
          </button>
        </div>
      )}

      {/* Join */}
      {view === 'join' && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-6 space-y-4 max-w-lg">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Join with Invite Code</h2>
          <div className="space-y-2">
            <Label>Invite Code</Label>
            <Input
              placeholder="e.g. A3B7K9"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              className="bg-muted/30 border-border/60 text-center text-lg tracking-widest font-bold uppercase"
              maxLength={6}
            />
          </div>
          <button
            onClick={() => joinMutation.mutate()}
            disabled={joinCode.length < 4 || joinMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {joinMutation.isPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Joining...</span> : 'Join League'}
          </button>
        </div>
      )}
    </div>
  );
}

function LeagueCard({ league, myMemberships, joinable, currentUser }) {
  const style = LEAGUE_TYPE_STYLES[league.type] || LEAGUE_TYPE_STYLES.public_cup;
  const Icon = style.icon;
  const membership = myMemberships?.find(m => m.league_id === league.id);

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 hover:border-primary/20 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", style.bg)}>
            <Icon className={cn("w-5 h-5", style.color)} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{league.name}</p>
            <p className="text-[10px] text-muted-foreground">{style.label} · {league.member_ids?.length || 0} members</p>
            {league.description && <p className="text-xs text-muted-foreground mt-1 truncate">{league.description}</p>}
            {membership && <span className="inline-block mt-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{membership.division_tier} · {membership.total_points || 0} pts</span>}
          </div>
        </div>
        {league.invite_code && (
          <button
            onClick={() => { navigator.clipboard.writeText(league.invite_code); toast.success('Code copied!'); }}
            className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Copy className="w-3 h-3" /> {league.invite_code}
          </button>
        )}
      </div>
    </div>
  );
}