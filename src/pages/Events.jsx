import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import EventCard from '@/components/shared/EventCard';
import DisciplineFilter from '@/components/shared/DisciplineFilter';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { categorizeEvents } from '@/lib/dataGating';

const STATUS_TABS = ['all', 'upcoming', 'live', 'completed'];

export default function Events() {
  const [discipline, setDiscipline] = useState(null);
  const [statusTab, setStatusTab] = useState('all');

  const { data: eventsRaw = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date', 100),
  });

  const { data: fights = [] } = useQuery({
    queryKey: ['all-fights-events-page'],
    queryFn: () => base44.entities.Fight.list('order', 100),
  });

  const { data: fighters = [] } = useQuery({
    queryKey: ['fighters-events-page'],
    queryFn: () => base44.entities.Fighter.list('name', 50),
  });

  const isLoading = eventsLoading;

  // Categorize all events through verification
  const { verified, partial, needsReview } = categorizeEvents(eventsRaw, fights, fighters);
  const allDisplayable = [...verified, ...partial, ...needsReview];

  // Build lookup for fast tier access
  const eventTiers = {};
  for (const e of allDisplayable) eventTiers[e.event.id] = e.verification.tier;

  const events = allDisplayable.map(e => e.event);

  const filtered = events.filter(e => {
    const dMatch = !discipline || e.discipline === discipline;
    const sMatch = statusTab === 'all' || e.status === statusTab;
    return dMatch && sMatch;
  });

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse all combat sports events</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => {
            const tier = eventTiers[e.id];
            return <EventCard key={e.id} event={e} verificationTier={tier} />;
          })}
        </div>
      ) : (
        <EmptyState message="No events match your filters" />
      )}
    </div>
  );
}