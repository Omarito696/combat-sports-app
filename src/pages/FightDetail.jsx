import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Zap, Shield, Target, Crown, Radio, Send, Clock, Swords } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import FighterAvatar from '@/components/shared/FighterAvatar';
import DisciplineBadge from '@/components/shared/DisciplineBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';

const EVENT_TYPE_STYLES = {
  strike: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: Zap },
  takedown: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Shield },
  submission_attempt: { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Target },
  knockdown: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: Zap },
  cut: { color: 'text-red-300', bg: 'bg-red-500/5 border-red-500/15', icon: Zap },
  point_deduction: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Shield },
  round_end: { color: 'text-muted-foreground', bg: 'bg-muted/30 border-border/40', icon: Clock },
  fight_end: { color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Crown },
  other: { color: 'text-foreground/70', bg: 'bg-card/50 border-border/40', icon: Radio },
};

function CommentaryTicker({ events }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {events.map((ev) => {
          const style = EVENT_TYPE_STYLES[ev.type] || EVENT_TYPE_STYLES.other;
          const Icon = style.icon;
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn('flex items-start gap-3 p-3 rounded-xl border', style.bg)}
            >
              <div className={cn('mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center', style.bg)}>
                <Icon className={cn('w-3.5 h-3.5', style.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {ev.round && <span className="text-[10px] font-bold text-muted-foreground uppercase">R{ev.round}{ev.time && ` · ${ev.time}`}</span>}
                  {ev.fighter_name && <span className={cn('text-[10px] font-bold uppercase tracking-wide', style.color)}>{ev.fighter_name}</span>}
                </div>
                <p className="text-sm leading-snug text-foreground/90">{ev.description}</p>
              </div>
              <span className="text-[9px] text-muted-foreground shrink-0 mt-1">
                {format(parseISO(ev.created_date), 'HH:mm')}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

function AddCommentaryForm({ fightId, isAdmin }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [round, setRound] = useState(1);
  const [time, setTime] = useState('');
  const [type, setType] = useState('other');
  const [fighter, setFighter] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FightEvent.create(data),
    onSuccess: () => { qc.invalidateQueries(['fight-events', fightId]); setText(''); setTime(''); },
  });


  if (!isAdmin) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Commentary Event</p>
      <div className="flex gap-2">
        <select value={type} onChange={e => setType(e.target.value)} className="flex-1 bg-background border border-border/60 rounded-lg px-3 py-2 text-sm">
          {Object.keys(EVENT_TYPE_STYLES).map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <input value={round} onChange={e => setRound(Number(e.target.value))} type="number" min={1} max={5} placeholder="Rnd" className="w-16 bg-background border border-border/60 rounded-lg px-3 py-2 text-sm" />
        <input value={time} onChange={e => setTime(e.target.value)} placeholder="2:34" className="w-20 bg-background border border-border/60 rounded-lg px-3 py-2 text-sm" />
      </div>
      <input value={fighter} onChange={e => setFighter(e.target.value)} placeholder="Fighter name (optional)" className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Describe what just happened..." rows={2} className="flex-1 bg-background border border-border/60 rounded-lg px-3 py-2 text-sm resize-none" />

      </div>
      <button
        onClick={() => createMutation.mutate({ fight_id: fightId, round, time, type, fighter_name: fighter, description: text })}
        disabled={!text.trim()}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" /> Post Event
      </button>
    </div>
  );
}

export default function FightDetail() {
  const { id } = useParams();
  const [isAdmin, setIsAdmin] = useState(false);

  const { data: fights = [] } = useQuery({
    queryKey: ['fight', id],
    queryFn: () => base44.entities.Fight.list('order', 200),
  });
  const fight = fights.find(f => f.id === id);

  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-date', 50) });
  const { data: fighters = [] } = useQuery({ queryKey: ['fighters'], queryFn: () => base44.entities.Fighter.list('name', 200) });
  const { data: fightEvents = [] } = useQuery({
    queryKey: ['fight-events', id],
    queryFn: () => base44.entities.FightEvent.filter({ fight_id: id }, 'created_date', 200),
    refetchInterval: fight?.status === 'live' ? 5000 : false,
  });

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  if (!fight) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Swords className="w-12 h-12 text-muted-foreground/30" />
      <p className="text-muted-foreground">Fight not found</p>
      <Link to="/" className="text-primary text-sm hover:underline">← Back to schedule</Link>
    </div>
  );

  const event = events.find(e => e.id === fight.event_id);
  const fighterA = fighters.find(f => f.name === fight.fighter_a_name);
  const fighterB = fighters.find(f => f.name === fight.fighter_b_name);
  const isCompleted = fight.status === 'completed';
  const isLive = fight.status === 'live';
  const aWon = fight.winner_name === fight.fighter_a_name;
  const bWon = fight.winner_name === fight.fighter_b_name;

  return (
    <div className="space-y-6 pb-24 md:pb-8 max-w-2xl mx-auto">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Event badge */}
      {event && (
        <div className="flex items-center gap-2 flex-wrap">
          <DisciplineBadge discipline={fight.discipline} />
          <span className="text-sm text-muted-foreground">{event.organization ? `${event.organization} · ` : ''}{event.name}</span>
          {event.date && <span className="text-xs text-muted-foreground">· {format(parseISO(event.date), 'MMM d, yyyy')}</span>}
          <StatusBadge status={fight.status} />
        </div>
      )}

      {/* Title fight / main event banners */}
      {fight.is_title_fight && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-amber-400">TITLE FIGHT — {fight.weight_class}</span>
        </div>
      )}

      {/* Matchup Hero */}
      <div className={cn(
        "rounded-2xl border p-6 md:p-8",
        isLive ? "border-red-500/30 bg-red-500/5" : "border-border/60 bg-card/50"
      )}>
        {isLive && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Live Now</span>
          </div>
        )}
        <div className="flex items-center gap-4">
          {/* Fighter A */}
          <div className={cn("flex-1 flex flex-col items-center gap-3 text-center", isCompleted && !aWon && "opacity-40")}>
            <FighterAvatar fighter={fighterA || { name: fight.fighter_a_name }} size="xl" />
            {aWon && <Crown className="w-5 h-5 text-amber-400" />}
            <div>
              <p className={cn("font-heading text-lg md:text-2xl font-bold uppercase tracking-wide leading-tight", aWon && "text-primary")}>
                {fight.fighter_a_name}
              </p>
              {fighterA && <p className="text-sm text-muted-foreground mt-0.5">{fighterA.wins}-{fighterA.losses}{fighterA.draws ? `-${fighterA.draws}` : ''}</p>}
              {fighterA?.nationality && <p className="text-xs text-muted-foreground">{fighterA.nationality}</p>}
            </div>
          </div>

          {/* VS / Result */}
          <div className="flex flex-col items-center shrink-0 gap-2">
            {isCompleted && fight.winner_name ? (
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Winner</p>
                <p className="font-heading text-sm font-bold text-primary uppercase">{fight.winner_name?.split(' ').pop()}</p>
                {fight.method && <p className="text-xs text-muted-foreground mt-1">{fight.method}</p>}
                {fight.finish_round && <p className="text-xs text-muted-foreground">R{fight.finish_round} · {fight.finish_time}</p>}
              </div>
            ) : (
              <span className="font-heading text-2xl font-bold text-muted-foreground/50">VS</span>
            )}
            <span className="text-xs text-muted-foreground">{fight.rounds}R · {fight.weight_class}</span>
          </div>

          {/* Fighter B */}
          <div className={cn("flex-1 flex flex-col items-center gap-3 text-center", isCompleted && !bWon && "opacity-40")}>
            <FighterAvatar fighter={fighterB || { name: fight.fighter_b_name }} size="xl" />
            {bWon && <Crown className="w-5 h-5 text-amber-400" />}
            <div>
              <p className={cn("font-heading text-lg md:text-2xl font-bold uppercase tracking-wide leading-tight", bWon && "text-primary")}>
                {fight.fighter_b_name}
              </p>
              {fighterB && <p className="text-sm text-muted-foreground mt-0.5">{fighterB.wins}-{fighterB.losses}{fighterB.draws ? `-${fighterB.draws}` : ''}</p>}
              {fighterB?.nationality && <p className="text-xs text-muted-foreground">{fighterB.nationality}</p>}
            </div>
          </div>
        </div>

        {/* Scorecards */}
        {isCompleted && (fight.fighter_a_score || fight.fighter_b_score) && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center mb-2">Judges' Scorecards</p>
            <div className="flex justify-center gap-8 text-center">
              <div>
                <p className="text-lg font-bold">{fight.fighter_a_score}</p>
                <p className="text-xs text-muted-foreground">{fight.fighter_a_name}</p>
              </div>
              <div>
                <p className="text-lg font-bold">{fight.fighter_b_score}</p>
                <p className="text-xs text-muted-foreground">{fight.fighter_b_name}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fighter Stats Comparison */}
      {(fighterA || fighterB) && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Stats Comparison</p>
          <div className="space-y-3">
            {[
              { label: 'Wins', a: fighterA?.wins, b: fighterB?.wins },
              { label: 'Losses', a: fighterA?.losses, b: fighterB?.losses },
              { label: 'Ranking', a: fighterA?.ranking, b: fighterB?.ranking },
            ].filter(s => s.a != null || s.b != null).map(({ label, a, b }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm font-bold w-8 text-right">{a ?? '—'}</span>
                <div className="flex-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
                <span className="text-sm font-bold w-8">{b ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Commentary Section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Radio className={cn("w-4 h-4", isLive ? "text-red-400" : "text-muted-foreground")} />
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
            {isLive ? 'Live Commentary' : 'Fight Commentary'}
          </h2>
          {isLive && <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 animate-pulse">LIVE</span>}
        </div>

        {fightEvents.length > 0 ? (
          <CommentaryTicker events={[...fightEvents].reverse()} />
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-border/40 bg-card/30">
            <Radio className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">{isLive ? 'Waiting for first event...' : 'No commentary recorded for this fight.'}</p>
          </div>
        )}

        {/* Admin commentary input */}
        {isAdmin && (
          <div className="mt-4">
            <AddCommentaryForm fightId={id} isAdmin={isAdmin} />
          </div>
        )}
      </section>
    </div>
  );
}