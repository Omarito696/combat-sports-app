import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Flame, Anchor, CircleDot, Search, Loader2, RefreshCw, X, Plus, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SLOTS = [
  {
    key: 'striker',
    label: 'Striker',
    icon: Flame,
    color: 'orange',
    ratingKey: 'striking_rating',
    costKey: 'striking_token_cost',
    desc: 'KOs, Knockdowns, Sig. Strikes',
  },
  {
    key: 'wrestler',
    label: 'Wrestler',
    icon: Anchor,
    color: 'blue',
    ratingKey: 'wrestling_rating',
    costKey: 'wrestling_token_cost',
    desc: 'Takedowns, Control, Dominance',
  },
  {
    key: 'grappler',
    label: 'Grappler',
    icon: CircleDot,
    color: 'purple',
    ratingKey: 'grappling_rating',
    costKey: 'grappling_token_cost',
    desc: 'Submissions, Sweeps, Passes',
  },
];

const TOKEN_BUDGET = 100;

const slotColorMap = {
  orange: {
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    ring: 'ring-orange-500/40',
    glow: 'shadow-orange-500/20',
  },
  blue: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    ring: 'ring-blue-500/40',
    glow: 'shadow-blue-500/20',
  },
  purple: {
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    ring: 'ring-purple-500/40',
    glow: 'shadow-purple-500/20',
  },
};

function calcTokenCost(rating) {
  return Math.round(10 + Math.pow(rating / 100, 1.5) * 40);
}

function FighterAvatar({ fighter, size = 'md' }) {
  const sizeClasses = { sm: 'w-10 h-10 text-sm', md: 'w-14 h-14 text-base', lg: 'w-20 h-20 text-xl' };
  const initials = fighter.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return fighter.image_url ? (
    <img
      src={fighter.image_url}
      alt={fighter.name}
      className={cn('rounded-full object-cover border-2 border-border/50', sizeClasses[size])}
    />
  ) : (
    <div className={cn('rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground border-2 border-border/40', sizeClasses[size])}>
      {initials}
    </div>
  );
}

function RatingBar({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full', pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">{Math.round(pct)}</span>
    </div>
  );
}

// Fighter picker modal
function FighterPickerModal({ slot, fighters, fights, onSelect, onClose, loadingFighterData, onFetchData }) {
  const [search, setSearch] = useState('');
  const c = slotColorMap[slot.color];
  const Icon = slot.icon;

  // Find opponent for each fighter
  const getOpponent = (fighter) => {
    const fight = fights.find(f =>
      f.fighter_a_name === fighter.name || f.fighter_b_name === fighter.name
    );
    if (!fight) return null;
    return {
      opponent: fight.fighter_a_name === fighter.name ? fight.fighter_b_name : fight.fighter_a_name,
      discipline: fight.discipline,
    };
  };

  const filtered = fighters
    .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[slot.costKey] - a[slot.costKey]); // ranked by price desc

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border/60 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('p-5 border-b border-border/50 flex items-center justify-between', c.bg)}>
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', c.border, c.bg)}>
              <Icon className={cn('w-5 h-5', c.text)} />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Pick {slot.label}</h2>
              <p className="text-xs text-muted-foreground">{slot.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/40 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search fighters..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-muted/30 border-border/60"
              autoFocus
            />
          </div>
        </div>

        {/* Fighter Cards Grid */}
        <div className="overflow-y-auto p-4 flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No fighters with scheduled fights this week
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(fighter => {
                const cost = fighter[slot.costKey];
                const rating = fighter[slot.ratingKey];
                const match = getOpponent(fighter);
                return (
                  <div
                    key={fighter.id}
                    onClick={() => { onSelect(fighter); onClose(); }}
                    className={cn(
                      'rounded-xl border p-4 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all duration-200 group',
                      'border-border/50 bg-card/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <FighterAvatar fighter={fighter} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{fighter.name}</p>
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border shrink-0', c.badge)}>
                            {cost}T
                          </span>
                        </div>
                        {match && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            vs <span className="text-foreground/70">{match.opponent}</span> · {match.discipline}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{fighter.weight_class || fighter.discipline}</span>
                          <RatingBar value={rating} />
                        </div>
                      </div>
                    </div>
                    {/* Stats row */}
                    <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Rating</p>
                        <p className={cn('text-xs font-bold', c.text)}>{Math.round(rating)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">KO%</p>
                        <p className="text-xs font-bold text-foreground">{fighter.ko_rate ? `${Math.round(fighter.ko_rate)}%` : '—'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Sub%</p>
                        <p className="text-xs font-bold text-foreground">{fighter.sub_rate ? `${Math.round(fighter.sub_rate)}%` : '—'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Record</p>
                        <p className="text-xs font-bold text-foreground">{fighter.wins}-{fighter.losses}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); onFetchData(fighter); }}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Refresh live data"
                      >
                        {loadingFighterData === fighter.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                          : <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FantasyLineupBuilder() {
  const [lineup, setLineup] = useState({ striker: null, wrestler: null, grappler: null });
  const [activeSlot, setActiveSlot] = useState(null);
  const [loadingFighterData, setLoadingFighterData] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: fights = [] } = useQuery({
    queryKey: ['upcoming-fights'],
    queryFn: () => base44.entities.Fight.filter({ status: 'scheduled' }, 'order', 100),
  });

  const { data: fighters = [] } = useQuery({
    queryKey: ['fighters'],
    queryFn: () => base44.entities.Fighter.list('name', 200),
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['fighter-ratings'],
    queryFn: () => base44.entities.FighterRating.list('fighter_name', 500),
  });

  // Only fighters competing this week
  const weekFighterNames = new Set();
  fights.forEach(f => { weekFighterNames.add(f.fighter_a_name); weekFighterNames.add(f.fighter_b_name); });
  const weekFighters = fighters.filter(f => weekFighterNames.has(f.name));

  // Enrich with ratings + match info
  const enriched = weekFighters.filter(fighter => ratings.some(r => r.fighter_id === fighter.id && [r.striking_rating, r.wrestling_rating, r.grappling_rating].every(Number.isFinite))).map(fighter => {
    const rating = ratings.find(r => r.fighter_id === fighter.id);
    const sr = rating.striking_rating;
    const wr = rating.wrestling_rating;
    const gr = rating.grappling_rating;
    return {
      ...fighter,
      striking_rating: sr,
      wrestling_rating: wr,
      grappling_rating: gr,
      striking_token_cost: rating?.striking_token_cost ?? calcTokenCost(sr),
      wrestling_token_cost: rating?.wrestling_token_cost ?? calcTokenCost(wr),
      grappling_token_cost: rating?.grappling_token_cost ?? calcTokenCost(gr),
      ko_rate: rating?.ko_rate,
      sub_rate: rating?.sub_rate,
    };
  });

  const tokensSpent = SLOTS.reduce((sum, slot) => {
    const fighter = lineup[slot.key];
    if (!fighter) return sum;
    return sum + fighter[slot.costKey];
  }, 0);

  const canSubmit = lineup.striker && lineup.wrestler && lineup.grappler && tokensSpent <= TOKEN_BUDGET;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const weekNum = Math.ceil(now.getDate() / 7);
      return base44.entities.FantasyLineup.create({
        user_id: currentUser.id,
        week_number: weekNum,
        year: now.getFullYear(),
        week_id: `${now.getFullYear()}-W${weekNum}`,
        striker_fighter_id: lineup.striker?.id,
        striker_fighter_name: lineup.striker?.name,
        wrestler_fighter_id: lineup.wrestler?.id,
        wrestler_fighter_name: lineup.wrestler?.name,
        grappler_fighter_id: lineup.grappler?.id,
        grappler_fighter_name: lineup.grappler?.name,
        tokens_spent: tokensSpent,
      });
    },
    onSuccess: () => {
      toast.success('Lineup submitted!');
      queryClient.invalidateQueries({ queryKey: ['my-lineup'] });
    },
  });

  const fetchFighterData = async (fighter) => {
    setLoadingFighterData(fighter.id);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web and return detailed combat stats for fighter "${fighter.name}" (${fighter.discipline}). Include: KO rate %, submission rate %, takedown accuracy %, significant strikes per minute, recent record, and fighting style. Return as JSON.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            ko_rate: { type: 'number' },
            sub_rate: { type: 'number' },
            td_accuracy: { type: 'number' },
            sig_strikes_per_min: { type: 'number' },
            striking_rating: { type: 'number' },
            wrestling_rating: { type: 'number' },
            grappling_rating: { type: 'number' },
            notes: { type: 'string' },
          },
        },
      });
      const sr = Math.min(100, Math.max(0, result.striking_rating || 60));
      const wr = Math.min(100, Math.max(0, result.wrestling_rating || 55));
      const gr = Math.min(100, Math.max(0, result.grappling_rating || 55));
      await base44.entities.FighterRating.create({
        fighter_id: fighter.id,
        fighter_name: fighter.name,
        discipline: fighter.discipline,
        striking_rating: sr,
        wrestling_rating: wr,
        grappling_rating: gr,
        striking_token_cost: calcTokenCost(sr),
        wrestling_token_cost: calcTokenCost(wr),
        grappling_token_cost: calcTokenCost(gr),
        ko_rate: result.ko_rate,
        sub_rate: result.sub_rate,
        td_accuracy: result.td_accuracy,
        sig_strikes_per_min: result.sig_strikes_per_min,
        data_source_notes: result.notes,
        last_updated: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['fighter-ratings'] });
      toast.success(`${fighter.name} ratings updated`);
    } catch (e) {
      toast.error('Could not fetch fighter data');
    } finally {
      setLoadingFighterData(null);
    }
  };

  const getOpponent = (fighter) => {
    if (!fighter) return null;
    const fight = fights.find(f =>
      f.fighter_a_name === fighter.name || f.fighter_b_name === fighter.name
    );
    if (!fight) return null;
    return {
      opponent: fight.fighter_a_name === fighter.name ? fight.fighter_b_name : fight.fighter_a_name,
      discipline: fight.discipline,
    };
  };

  const activeSlotConfig = SLOTS.find(s => s.key === activeSlot);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/fantasy" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Build Lineup</h1>
          <p className="text-xs text-muted-foreground">This Week · {TOKEN_BUDGET} token budget</p>
        </div>
      </div>

      {/* Three slot cards side by side */}
      <div className="grid grid-cols-3 gap-3">
        {SLOTS.map(slot => {
          const c = slotColorMap[slot.color];
          const selected = lineup[slot.key];
          const Icon = slot.icon;
          const match = getOpponent(selected);
          return (
            <button
              key={slot.key}
              onClick={() => setActiveSlot(slot.key)}
              className={cn(
                'rounded-xl border p-3 md:p-4 text-left transition-all duration-200 relative group',
                c.border, c.bg,
                'hover:shadow-lg hover:shadow-current/10'
              )}
            >
              {/* Slot header */}
              <div className="flex items-center gap-1.5 mb-3">
                <Icon className={cn('w-4 h-4', c.text)} />
                <span className="font-heading text-xs font-bold uppercase tracking-wide">{slot.label}</span>
              </div>

              {selected ? (
                <div className="space-y-2">
                  {/* Avatar */}
                  <div className="flex justify-center">
                    <FighterAvatar fighter={selected} size="lg" />
                  </div>
                  {/* Name */}
                  <p className="font-semibold text-xs text-center leading-tight truncate">{selected.name}</p>
                  {/* Opponent this week */}
                  {match && (
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground leading-tight">
                        vs {match.opponent}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{match.discipline}</p>
                    </div>
                  )}
                  {/* Token cost */}
                  <div className="flex justify-center">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', c.badge)}>
                      {selected[slot.costKey]}T
                    </span>
                  </div>
                  {/* Change indicator */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-5 h-5 rounded-full bg-muted/80 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div className={cn('w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center', c.border)}>
                    <Plus className={cn('w-5 h-5 opacity-40', c.text)} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Tap to pick</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Token Budget */}
      <div className={cn('rounded-xl border p-4 transition-all', tokensSpent > TOKEN_BUDGET ? 'border-red-500/40 bg-red-500/5' : 'border-border/60 bg-card/50')}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Token Budget</span>
          <span className={cn('text-sm font-bold', tokensSpent > TOKEN_BUDGET ? 'text-red-400' : 'text-foreground')}>
            {tokensSpent} / {TOKEN_BUDGET}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', tokensSpent > TOKEN_BUDGET ? 'bg-red-500' : 'bg-primary')}
            style={{ width: `${Math.min(100, (tokensSpent / TOKEN_BUDGET) * 100)}%` }}
          />
        </div>
        {tokensSpent > TOKEN_BUDGET && (
          <p className="text-xs text-red-400 mt-1">Over budget — swap a fighter for a cheaper option</p>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={() => submitMutation.mutate()}
        disabled={!canSubmit || submitMutation.isPending}
        className={cn(
          'w-full py-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all',
          canSubmit
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {submitMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
          </span>
        ) : 'Submit Lineup'}
      </button>

      {/* Fighter Picker Modal */}
      {activeSlot && activeSlotConfig && (
        <FighterPickerModal
          slot={activeSlotConfig}
          fighters={enriched}
          fights={fights}
          onSelect={(fighter) => setLineup(prev => ({ ...prev, [activeSlot]: fighter }))}
          onClose={() => setActiveSlot(null)}
          loadingFighterData={loadingFighterData}
          onFetchData={fetchFighterData}
        />
      )}
    </div>
  );
}