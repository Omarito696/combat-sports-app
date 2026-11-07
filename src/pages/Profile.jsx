import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Target, Star, Edit2, Check, X, Flame } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DisciplineBadge from '@/components/shared/DisciplineBadge';

const DISCIPLINES = ['MMA','Boxing','BJJ','Muay Thai','Kickboxing','Wrestling','Judo','Karate','Taekwondo','Kung Fu / Wushu'];

const TIER_STYLES = {
  Bronze: { color: 'text-amber-700', bg: 'bg-amber-700/10 border-amber-700/30' },
  Silver: { color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/30' },
  Gold: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  Elite: { color: 'text-primary', bg: 'bg-primary/10 border-primary/30' },
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 text-center">
      <Icon className={cn('w-5 h-5 mx-auto mb-2', color)} />
      <p className="font-heading text-2xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['user-profile', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.UserProfile.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const { data: fighters = [] } = useQuery({
    queryKey: ['fighters'],
    queryFn: () => base44.entities.Fighter.list('name', 200),
  });

  const { data: myPredictions = [] } = useQuery({
    queryKey: ['my-predictions', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.Prediction.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const { data: myLineups = [] } = useQuery({
    queryKey: ['my-lineups', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.FantasyLineup.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const profile = profiles[0];
  const correctPredictions = myPredictions.filter(p => p.is_correct_winner).length;
  const totalFantasyPts = myLineups.reduce((s, l) => s + (l.total_points || 0), 0);
  const totalPredictionPts = myPredictions.reduce((s, p) => s + (p.points_earned || 0), 0);
  const accuracy = myPredictions.length > 0 ? Math.round((correctPredictions / myPredictions.length) * 100) : 0;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profile) {
        return base44.entities.UserProfile.update(profile.id, data);
      } else {
        return base44.entities.UserProfile.create({ ...data, user_id: currentUser.id });
      }
    },
    onSuccess: () => {
      toast.success('Profile saved!');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    setEditData({
      username: profile?.username || currentUser?.full_name || '',
      favorite_discipline: profile?.favorite_discipline || '',
      favorite_fighter_name: profile?.favorite_fighter_name || '',
      bio: profile?.bio || '',
    });
    setEditing(true);
  };

  const tier = profile?.division_tier || 'Bronze';
  const tierStyle = TIER_STYLES[tier];

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8 max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="relative rounded-2xl border border-border/60 bg-card/50 p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/30" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border-2 border-primary/20">
                <span className="font-display text-3xl font-bold text-primary">
                  {(profile?.username || currentUser.full_name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className={cn('absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold border', tierStyle.bg, tierStyle.color)}>
              {tier}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">
                  {profile?.username || currentUser.full_name || 'Fighter'}
                </h1>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              </div>
              <button
                onClick={startEdit}
                className="p-2 rounded-lg hover:bg-accent transition-colors shrink-0"
              >
                <Edit2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {profile?.bio && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{profile.bio}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {profile?.favorite_discipline && (
                <DisciplineBadge discipline={profile.favorite_discipline} />
              )}
              {profile?.favorite_fighter_name && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <Star className="w-3 h-3" /> {profile.favorite_fighter_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Flame} label="Fantasy Pts" value={totalFantasyPts} color="text-orange-400" />
        <StatCard icon={Target} label="Prediction Pts" value={totalPredictionPts} color="text-blue-400" />
        <StatCard icon={Check} label="Accuracy" value={`${accuracy}%`} color="text-green-400" />
        <StatCard icon={Trophy} label="Lineups" value={myLineups.length} color="text-amber-400" />
      </div>

      {/* Accomplishments */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-5">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> Accomplishments
        </h2>
        <div className="space-y-3">
          <Accomplishment
            unlocked={myLineups.length >= 1}
            icon="🥊"
            title="First Lineup"
            desc="Submitted your first weekly lineup"
          />
          <Accomplishment
            unlocked={myPredictions.length >= 5}
            icon="🎯"
            title="Prediction Addict"
            desc="Made 5 or more predictions"
          />
          <Accomplishment
            unlocked={accuracy >= 60 && myPredictions.length >= 5}
            icon="🧠"
            title="Sharp Mind"
            desc="60%+ prediction accuracy (min. 5 picks)"
          />
          <Accomplishment
            unlocked={tier === 'Gold' || tier === 'Elite'}
            icon="🏆"
            title="Gold Status"
            desc="Reached Gold division"
          />
          <Accomplishment
            unlocked={tier === 'Elite'}
            icon="👑"
            title="Elite Fighter"
            desc="Reached the Elite division"
          />
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditing(false)}>
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Edit Profile</h2>
              <button onClick={() => setEditing(false)} className="p-2 rounded-lg hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Username</label>
                <Input
                  value={editData.username}
                  onChange={e => setEditData(p => ({ ...p, username: e.target.value }))}
                  placeholder="Your display name"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Bio</label>
                <Input
                  value={editData.bio}
                  onChange={e => setEditData(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Favorite Discipline</label>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINES.map(d => (
                    <button
                      key={d}
                      onClick={() => setEditData(p => ({ ...p, favorite_discipline: d }))}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                        editData.favorite_discipline === d
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'border-border/60 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Favorite Fighter</label>
                <select
                  value={editData.favorite_fighter_name}
                  onChange={e => setEditData(p => ({ ...p, favorite_fighter_name: e.target.value }))}
                  className="w-full bg-muted/30 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a fighter...</option>
                  {fighters.map(f => (
                    <option key={f.id} value={f.name}>{f.name} ({f.discipline})</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => saveMutation.mutate(editData)}
              disabled={saveMutation.isPending}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Accomplishment({ icon, title, desc, unlocked }) {
  return (
    <div className={cn('flex items-center gap-4 p-3 rounded-xl border transition-all', unlocked ? 'border-primary/20 bg-primary/5' : 'border-border/40 bg-muted/20 opacity-50')}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className={cn('text-sm font-semibold', unlocked ? 'text-foreground' : 'text-muted-foreground')}>{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {unlocked && <Check className="w-4 h-4 text-green-400 ml-auto shrink-0" />}
    </div>
  );
}