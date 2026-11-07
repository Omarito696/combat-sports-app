import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import FighterAvatar from './FighterAvatar';
import DisciplineBadge from './DisciplineBadge';
import { DISPLAY_TIER } from '@/lib/verification';
import { Trophy, Crown, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function FightCard({ fight, event, verificationTier, fighters = [] }) {
  const isReview = verificationTier === DISPLAY_TIER.ADMIN_REVIEW;
  const isCompleted = fight.status === 'completed';
  const aWon = fight.winner_name === fight.fighter_a_name;
  const bWon = fight.winner_name === fight.fighter_b_name;

  // Use real Fighter entities for images — searches the fighters list passed from parent pages
  const fighterA = fighters.find(f => f.name === fight.fighter_a_name) || { name: fight.fighter_a_name };
  const fighterB = fighters.find(f => f.name === fight.fighter_b_name) || { name: fight.fighter_b_name };

  return (
    <div className={cn(
      "relative rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-border",
      fight.is_main_event && "border-primary/30 bg-primary/[0.02]",
      fight.status === 'live' && "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
    )}>
      {fight.is_title_fight && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 bg-amber-500/10 border-b border-amber-500/20">
          <Crown className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Title Fight</span>
        </div>
      )}
      {fight.is_main_event && !fight.is_title_fight && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 bg-primary/5 border-b border-primary/20">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Main Event</span>
        </div>
      )}

      <div className="p-4">
        {/* Verification warning for admin_review fights */}
        {isReview && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-medium text-amber-400">Under review — data may be incomplete</span>
          </div>
        )}

        {/* Event + meta row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <DisciplineBadge discipline={fight.discipline} />
            {(event?.organization || fight.organization) && (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/40">
                {event?.organization || fight.organization}
              </span>
            )}
            {fight.weight_class && (
              <span className="text-[10px] text-muted-foreground">{fight.weight_class}</span>
            )}
          </div>
          <StatusBadge status={fight.status} />
        </div>

        {/* Matchup with avatars */}
        <div className="flex items-center gap-3">
          {/* Fighter A */}
          <div className={cn("flex-1 flex flex-col items-center gap-1.5 text-center transition-opacity", isCompleted && !aWon && "opacity-40")}>
            <FighterAvatar fighter={fighterA} size="md" />
            <p className={cn("font-heading text-sm font-bold uppercase tracking-wide leading-tight", aWon && "text-primary")}>
              {fight.fighter_a_name}
            </p>
            {fight.fighter_a_record && (
              <p className="text-[10px] text-muted-foreground">{fight.fighter_a_record}</p>
            )}
            {isCompleted && fight.fighter_a_score && (
              <p className="text-xs text-muted-foreground">{fight.fighter_a_score}</p>
            )}
          </div>

          {/* VS / Result */}
          <div className="flex flex-col items-center shrink-0 gap-1">
            {isCompleted && fight.winner_name ? (
              <Trophy className="w-5 h-5 text-primary" />
            ) : fight.status === 'live' ? (
              <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
              </span>
            ) : (
              <span className="text-xs font-bold text-muted-foreground">VS</span>
            )}
            <span className="text-[10px] text-muted-foreground">{fight.rounds}R</span>
          </div>

          {/* Fighter B */}
          <div className={cn("flex-1 flex flex-col items-center gap-1.5 text-center transition-opacity", isCompleted && !bWon && "opacity-40")}>
            <FighterAvatar fighter={fighterB} size="md" />
            <p className={cn("font-heading text-sm font-bold uppercase tracking-wide leading-tight", bWon && "text-primary")}>
              {fight.fighter_b_name}
            </p>
            {fight.fighter_b_record && (
              <p className="text-[10px] text-muted-foreground">{fight.fighter_b_record}</p>
            )}
            {isCompleted && fight.fighter_b_score && (
              <p className="text-xs text-muted-foreground">{fight.fighter_b_score}</p>
            )}
          </div>
        </div>

        {/* Time */}
        {!isCompleted && event?.date && (
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{format(parseISO(event.date), 'MMM d, yyyy · h:mm a')}</p>
          </div>
        )}

        {/* Result Details */}
        {isCompleted && fight.method && (
          <div className="mt-3 pt-3 border-t border-border/50 text-center">
            <p className="text-xs font-semibold text-foreground/80">
              {fight.method}
              {fight.finish_round && <span className="text-muted-foreground"> · R{fight.finish_round}</span>}
              {fight.finish_time && <span className="text-muted-foreground"> · {fight.finish_time}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}