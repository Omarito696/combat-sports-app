import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Check, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import FighterAvatar from '@/components/shared/FighterAvatar';

const DISCIPLINES = ['MMA', 'Boxing', 'BJJ', 'Muay Thai', 'Kickboxing', 'Wrestling', 'Judo', 'Karate', 'Taekwondo', 'Kung Fu / Wushu'];
const DISC_COLORS = {
  MMA: 'border-red-500/40 bg-red-500/10 text-red-400',
  Boxing: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  BJJ: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
  'Muay Thai': 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  Kickboxing: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  Wrestling: 'border-green-500/40 bg-green-500/10 text-green-400',
  Judo: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  Karate: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
  Taekwondo: 'border-pink-500/40 bg-pink-500/10 text-pink-400',
  'Kung Fu / Wushu': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
};

const STEPS = ['welcome', 'discipline', 'fighters', 'organizations', 'done'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [favDiscipline, setFavDiscipline] = useState('');
  const [followedDiscs, setFollowedDiscs] = useState([]);
  const [followedFighters, setFollowedFighters] = useState([]);
  const [followedOrgs, setFollowedOrgs] = useState([]);
  const [searchFighter, setSearchFighter] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: fighters = [] } = useQuery({ queryKey: ['fighters'], queryFn: () => base44.entities.Fighter.list('name', 200) });
  const { data: orgs = [] } = useQuery({ queryKey: ['organizations'], queryFn: () => base44.entities.Organization.list('name', 100) });
  const { data: existingProfiles = [] } = useQuery({
    queryKey: ['my-profile-check', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.UserProfile.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const filteredFighters = fighters.filter(f =>
    !searchFighter || f.name.toLowerCase().includes(searchFighter.toLowerCase())
  );

  const toggleItem = (id, list, setList) => {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleFinish = async () => {
    setSaving(true);
    const profileData = {
      user_id: currentUser.id,
      username: username || currentUser.full_name,
      favorite_discipline: favDiscipline,
      followed_fighter_ids: followedFighters,
      followed_org_ids: followedOrgs,
    };
    if (existingProfiles[0]) {
      await base44.entities.UserProfile.update(existingProfiles[0].id, profileData);
    } else {
      await base44.entities.UserProfile.create(profileData);
    }
    navigate('/');
  };

  const currentStep = STEPS[step];
  const progress = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Swords className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold tracking-wide uppercase">FightTracker</span>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">Step {step + 1} of {STEPS.length}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* WELCOME */}
            {currentStep === 'welcome' && (
              <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center space-y-4">
                <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">Welcome!</h1>
                <p className="text-muted-foreground text-sm">Let's set up your FightTracker profile in 2 minutes.</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Your username</label>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={currentUser?.full_name || 'Enter a username'}
                    className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <button onClick={() => setStep(s => s + 1)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  Let's Go <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* DISCIPLINE */}
            {currentStep === 'discipline' && (
              <div className="rounded-2xl border border-border/60 bg-card/50 p-6 space-y-4">
                <h2 className="font-heading text-2xl font-bold uppercase tracking-tight">Pick Your Disciplines</h2>
                <p className="text-sm text-muted-foreground">Which martial arts do you follow? Select all that apply.</p>
                <div className="grid grid-cols-2 gap-2">
                  {DISCIPLINES.map(d => {
                    const sel = followedDiscs.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleItem(d, followedDiscs, setFollowedDiscs)}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                          sel ? DISC_COLORS[d] : 'border-border/50 text-muted-foreground hover:border-border'
                        )}
                      >
                        {d}
                        {sel && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Favourite discipline</label>
                  <div className="flex flex-wrap gap-2">
                    {followedDiscs.map(d => (
                      <button
                        key={d}
                        onClick={() => setFavDiscipline(d)}
                        className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all', favDiscipline === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground hover:border-border')}
                      >{d}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setStep(s => s + 1)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* FIGHTERS */}
            {currentStep === 'fighters' && (
              <div className="rounded-2xl border border-border/60 bg-card/50 p-6 space-y-4">
                <h2 className="font-heading text-2xl font-bold uppercase tracking-tight">Follow Fighters</h2>
                <p className="text-sm text-muted-foreground">Search and follow fighters you want to track.</p>
                <input
                  value={searchFighter}
                  onChange={e => setSearchFighter(e.target.value)}
                  placeholder="Search fighters..."
                  className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                />
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {filteredFighters.slice(0, 30).map(f => {
                    const sel = followedFighters.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggleItem(f.id, followedFighters, setFollowedFighters)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                          sel ? 'border-primary/40 bg-primary/5' : 'border-border/40 hover:border-border/60'
                        )}
                      >
                        <FighterAvatar fighter={f} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{f.discipline} · {f.weight_class}</p>
                        </div>
                        {sel && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                  {filteredFighters.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No fighters found</p>}
                </div>
                <button onClick={() => setStep(s => s + 1)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ORGANIZATIONS */}
            {currentStep === 'organizations' && (
              <div className="rounded-2xl border border-border/60 bg-card/50 p-6 space-y-4">
                <h2 className="font-heading text-2xl font-bold uppercase tracking-tight">Follow Organizations</h2>
                <p className="text-sm text-muted-foreground">Which promotions do you follow?</p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {orgs.map(org => {
                    const sel = followedOrgs.includes(org.id);
                    return (
                      <button
                        key={org.id}
                        onClick={() => toggleItem(org.id, followedOrgs, setFollowedOrgs)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                          sel ? 'border-primary/40 bg-primary/5' : 'border-border/40 hover:border-border/60'
                        )}
                      >
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-lg object-contain bg-background border border-border/30" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted border border-border/30 flex items-center justify-center text-xs font-bold">{org.name[0]}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.discipline} · {org.tier}</p>
                        </div>
                        {sel && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                  {orgs.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No organizations yet</p>}
                </div>
                <button onClick={() => setStep(s => s + 1)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* DONE */}
            {currentStep === 'done' && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-heading text-3xl font-bold uppercase tracking-tight">You're All Set!</h2>
                <p className="text-muted-foreground text-sm">Your profile is ready. Now let's track some fights.</p>
                <button onClick={handleFinish} disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-70">
                  {saving ? 'Saving...' : 'Enter FightTracker →'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}