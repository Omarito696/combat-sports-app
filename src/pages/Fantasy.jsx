import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Users, TrendingUp, ChevronRight, Target, Flame, Anchor, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import FighterAvatar from '@/components/shared/FighterAvatar';

const TABS = [
  { id: 'lineup', label: 'Weekly Lineup', icon: Flame },
  { id: 'leagues', label: 'Leagues & Cups', icon: Trophy },
  { id: 'predict', label: 'Predictions', icon: Target },
  { id: 'divisions', label: 'Divisions', icon: TrendingUp },
];

export default function Fantasy() {
  const [activeTab, setActiveTab] = useState('lineup');

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Tab Nav */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all flex-1 justify-center",
              activeTab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'lineup' && <FantasyLineupTab />}
      {activeTab === 'leagues' && <LeaguesTab />}
      {activeTab === 'predict' && <PredictionsTab />}
      {activeTab === 'divisions' && <DivisionsTab />}
    </div>
  );
}


function FantasyLineupTab() {
  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: myLineups = [] } = useQuery({
    queryKey: ['my-lineup-fantasy', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.FantasyLineup.filter({ user_id: currentUser.id }, '-created_date', 1) : [],
    enabled: !!currentUser,
  });
  const { data: fighters = [] } = useQuery({
    queryKey: ['fighters'],
    queryFn: () => base44.entities.Fighter.list('name', 200),
  });

  const latest = myLineups[0];

  const getF = (name) => fighters.find(f => f.name === name) || { name };

  return (
    <div className="grid gap-4">
      {/* Current lineup cards if submitted */}
      {latest ? (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Your Current Lineup · {latest.tokens_spent}T spent</p>
          <div className="grid grid-cols-3 gap-3">
            <LineupDisplayCard
              label="Striking" icon={Flame} color="orange"
              fighter={getF(latest.striker_fighter_name)}
              points={latest.striker_points}
            />
            <LineupDisplayCard
              label="Takedowns" icon={Anchor} color="blue"
              fighter={getF(latest.wrestler_fighter_name)}
              points={latest.wrestler_points}
            />
            <LineupDisplayCard
              label="Grappling" icon={CircleDot} color="purple"
              fighter={getF(latest.grappler_fighter_name)}
              points={latest.grappler_points}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <SlotCard label="Striking" icon={Flame} color="orange" description="KOs, knockdowns & significant strikes." />
          <SlotCard label="Takedowns" icon={Anchor} color="blue" description="Takedowns, control time & dominant positions." />
          <SlotCard label="Grappling" icon={CircleDot} color="purple" description="Submissions, sweeps, guard passes & escapes." />
        </div>
      )}
      <TokenBudgetBar used={latest?.tokens_spent || 0} total={100} />
      <Link
        to="/fantasy/lineup"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
      >
        {latest ? 'Change Lineup' : 'Build Your Lineup'} <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function LineupDisplayCard({ label, icon: Icon, color, fighter, points }) {
  const colorMap = {
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  };
  const badgeMap = {
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  return (
    <div className={cn('rounded-xl border p-3 flex flex-col items-center gap-2', colorMap[color])}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="font-heading text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <FighterAvatar fighter={fighter} size="md" />
      <p className="text-xs font-semibold text-center leading-tight truncate w-full text-center">{fighter.name || '—'}</p>
      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', badgeMap[color])}>
        {points || 0} pts
      </span>
    </div>
  );
}

function SlotCard({ label, icon: Icon, color, description }) {
  const colorMap = {
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  };
  return (
    <div className={cn("rounded-xl border p-3 flex flex-col items-center gap-2", colorMap[color])}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="font-heading text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-current/20 flex items-center justify-center">
        <span className="text-[9px] opacity-40">+</span>
      </div>
      <p className="text-[9px] opacity-60 leading-relaxed text-center">{description}</p>
    </div>
  );
}

function TokenBudgetBar({ used, total }) {
  const pct = (used / total) * 100;
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Token Budget</span>
        <span className="text-sm font-bold">{used} / {total}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{total - used} tokens remaining</p>
    </div>
  );
}

function LeaguesTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/fantasy/leagues/join" className="group rounded-xl border border-border/60 bg-card/50 p-5 hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Join a League</p>
              <p className="text-xs text-muted-foreground">Enter an invite code or find public leagues</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
        </Link>
        <Link to="/fantasy/leagues/create" className="group rounded-xl border border-border/60 bg-card/50 p-5 hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">Create a League / Cup</p>
              <p className="text-xs text-muted-foreground">Private league or cup for your friends</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
        </Link>
      </div>
      <Link to="/fantasy/leagues" className="block w-full py-3 text-center text-sm text-muted-foreground hover:text-primary transition-colors">
        View my leagues & cups <ChevronRight className="inline w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function PredictionsTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/50 p-5">
        <h3 className="font-heading text-lg font-bold uppercase tracking-wide mb-1">Predict Fights</h3>
        <p className="text-xs text-muted-foreground mb-4">Predict winners, methods and rounds. Earn points for correct calls.</p>
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <PointRule label="Correct Winner" pts={10} />
          <PointRule label="+ Correct Method" pts={15} />
          <PointRule label="+ Correct Round" pts={25} />
        </div>
        <Link to="/fantasy/predictions" className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors">
          Make Predictions <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function PointRule({ label, pts }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-lg font-bold text-primary">+{pts}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function DivisionsTab() {
  const tiers = [
    { name: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-700/10 border-amber-700/20', desc: 'Starting division' },
    { name: 'Silver', color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20', desc: 'Top 3 promoted from Bronze' },
    { name: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', desc: 'Top 3 promoted from Silver' },
    { name: 'Elite', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', desc: 'Top 3 promoted from Gold' },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Weekly results determine promotion and relegation. Top 3 move up, bottom 3 drop down.</p>
      {tiers.map(({ name, color, bg, desc }) => (
        <div key={name} className={cn("rounded-xl border p-4 flex items-center justify-between", bg)}>
          <div>
            <p className={cn("font-heading text-xl font-bold uppercase tracking-wide", color)}>{name}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <Link to="/fantasy/divisions" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            View <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      ))}
    </div>
  );
}