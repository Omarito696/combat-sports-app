import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FightCard from '@/components/shared/FightCard';
import DisciplineFilter from '@/components/shared/DisciplineFilter';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { categorizeFights } from '@/lib/dataGating';

const STATUS_TABS = ['all', 'scheduled', 'live', 'completed'];

export default function Fights() {
  const [discipline, setDiscipline] = useState(null);
  const [statusTab, setStatusTab] = useState('all');

  const { data: fightsRaw = [], isLoading: fightsLoading } = useQuery({
    queryKey: ['fights'],
    queryFn: () => base44.entities.Fight.list('-created_date', 100),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('name', 50),
  });

  const { data: fighters = [] } = useQuery({
    queryKey: ['fighters'],
    queryFn: () => base44.entities.Fighter.list('name', 100),
  });

  const isLoading = fightsLoading;

  // Categorize all fights through verification
  const { verified, needsReview } = categorizeFights(fightsRaw, events, fighters);
  const allDisplayable = [...verified, ...needsReview];

  // Build lookup for fast tier access
  const fightTiers = {};
  for (const f of allDisplayable) fightTiers[f.fight.id] = f.verification.tier;

  const fights = allDisplayable.map(f => f.fight);

  const filtered = fights.filter(f => {
    const dMatch = !discipline || f.discipline === discipline;
    const sMatch = statusTab === 'all' || f.status === statusTab;
    return dMatch && sMatch;
  });

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Fights</h1>
        <p className="text-sm text-muted-foreground mt-1">All fights across disciplines</p>
      </div>

      <DisciplineFilter selected={discipline} onSelect={setDiscipline} />

      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all",
              statusTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === 'all' ? 'All' : tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(f => {
            const tier = fightTiers[f.id];
            return <FightCard key={f.id} fight={f} verificationTier={tier} fighters={fighters} />;
          })}
        </div>
      ) : (
        <EmptyState message="No fights match your filters" />
      )}
    </div>
  );
}