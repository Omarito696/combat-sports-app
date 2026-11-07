import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Crown, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TIER_CONFIG = {
  Elite: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', badge: 'from-primary/20 to-primary/5', crown: true },
  Gold: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', badge: 'from-yellow-400/20 to-yellow-400/5' },
  Silver: { color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/20', badge: 'from-slate-300/20 to-slate-300/5' },
  Bronze: { color: 'text-amber-700', bg: 'bg-amber-700/10', border: 'border-amber-700/20', badge: 'from-amber-700/20 to-amber-700/5' },
};

const TIERS = ['Elite', 'Gold', 'Silver', 'Bronze'];

export default function Divisions() {
  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: members = [] } = useQuery({
    queryKey: ['all-members'],
    queryFn: () => base44.entities.LeagueMember.list('-total_points', 500),
  });

  const myMembership = members.find(m => m.user_id === currentUser?.id);

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <div className="flex items-center gap-3">
        <Link to="/fantasy" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Divisions</h1>
          <p className="text-xs text-muted-foreground">Top 3 promote each week · Bottom 3 relegate</p>
        </div>
      </div>

      {myMembership && (
        <div className={cn("rounded-xl border p-4 bg-gradient-to-br", TIER_CONFIG[myMembership.division_tier]?.badge, TIER_CONFIG[myMembership.division_tier]?.border)}>
          <p className="text-xs text-muted-foreground mb-1">Your Division</p>
          <div className="flex items-center justify-between">
            <p className={cn("font-heading text-2xl font-bold uppercase", TIER_CONFIG[myMembership.division_tier]?.color)}>
              {myMembership.division_tier}
            </p>
            <div className="text-right">
              <p className="text-xl font-bold">{myMembership.total_points || 0} pts</p>
              <p className="text-xs text-muted-foreground">Rank #{myMembership.rank || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {TIERS.map(tier => {
        const tierMembers = members.filter(m => m.division_tier === tier)
          .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
          .slice(0, 20);
        const config = TIER_CONFIG[tier];

        return (
          <div key={tier} className="space-y-3">
            <div className={cn("flex items-center gap-2 rounded-xl border p-3", config.bg, config.border)}>
              {config.crown && <Crown className={cn("w-4 h-4", config.color)} />}
              <h2 className={cn("font-heading text-lg font-bold uppercase tracking-wide", config.color)}>{tier} Division</h2>
              <span className="text-xs text-muted-foreground ml-auto">{tierMembers.length} players</span>
            </div>

            {tierMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2">No players in this division yet.</p>
            ) : (
              <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                <div className="grid grid-cols-[2rem_1fr_auto] gap-3 px-4 py-2 border-b border-border/50 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  <span>#</span>
                  <span>Player</span>
                  <span>Points</span>
                </div>
                {tierMembers.map((member, idx) => {
                  const isMe = member.user_id === currentUser?.id;
                  const isPromotion = idx < 3;
                  const isRelegation = idx >= tierMembers.length - 3 && tier !== 'Bronze';
                  return (
                    <div key={member.id}
                      className={cn(
                        "grid grid-cols-[2rem_1fr_auto] gap-3 items-center px-4 py-3 border-b border-border/30 last:border-0 transition-colors",
                        isMe && "bg-primary/5",
                      )}>
                      <span className={cn("text-sm font-bold text-center",
                        isPromotion && tier !== 'Elite' ? "text-green-400" : isRelegation ? "text-red-400" : "text-muted-foreground")}>
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("text-sm font-semibold truncate", isMe && "text-primary")}>
                          {member.user_name || 'Player'}
                        </span>
                        {isMe && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">YOU</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold">{member.total_points || 0}</span>
                        {isPromotion && tier !== 'Elite' && <TrendingUp className="w-3 h-3 text-green-400" />}
                        {isRelegation && <TrendingDown className="w-3 h-3 text-red-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}