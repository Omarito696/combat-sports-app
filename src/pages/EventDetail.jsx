import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, Building2, AlertTriangle } from 'lucide-react';
import FightCard from '@/components/shared/FightCard';
import DisciplineBadge from '@/components/shared/DisciplineBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { categorizeFights } from '@/lib/dataGating';

export default function EventDetail() {
  const { id } = useParams();

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ id });
      return events[0] ?? null;
    },
    refetchInterval: query => query.state.data?.status === 'live' ? 30000 : false,
  });

  const { data: fights = [], isLoading: fightsLoading } = useQuery({
    queryKey: ['event-fights', id],
    queryFn: () => base44.entities.Fight.filter({ event_id: id }, 'order', 50),
    refetchInterval: event?.status === 'live' ? 30000 : false,
  });

  const { data: fighters = [] } = useQuery({
    queryKey: ['fighters-event-detail'],
    queryFn: () => base44.entities.Fighter.list('name', 50),
  });

  if (eventLoading || fightsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!event) {
    return <EmptyState message="Event not found" />;
  }

  // Categorize this event's fights through verification
  const { verified, needsReview } = categorizeFights(fights, [event], fighters);
  const displayableFights = [...verified, ...needsReview];
  const mainCard = displayableFights.filter(({ fight }) => fight.card_section === 'main' || fight.is_main_event);
  const earlyPrelims = displayableFights.filter(({ fight }) => fight.card_section === 'early_prelims');
  const prelimCard = displayableFights.filter(row => !mainCard.includes(row) && !earlyPrelims.includes(row));
  const quarantinedCount = fights.filter(fight => fight.status !== 'cancelled').length - displayableFights.length;
  const sections = [
    { label: 'Main Card', startsAt: event.main_card_at, bouts: mainCard },
    { label: mainCard.length ? 'Preliminary Card' : 'Fight Card', startsAt: event.prelims_at, bouts: prelimCard },
    { label: 'Early Prelims', startsAt: event.early_prelims_at, bouts: earlyPrelims },
  ];

  const isPartial = quarantinedCount > 0 || needsReview.length > 0;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <Link to="/events" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Events
      </Link>

      {/* Event Header */}
      <div className="relative rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
        {event.image_url && (
          <div className="h-48 md:h-64 overflow-hidden">
            <img src={event.image_url} alt={event.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          </div>
        )}
        <div className={event.image_url ? "absolute bottom-0 left-0 right-0 p-6" : "p-6"}>
          <div className="flex items-center gap-2 mb-2">
            <DisciplineBadge discipline={event.discipline} />
            <StatusBadge status={event.status} />
            {isPartial && (
              <span className="text-[9px] font-semibold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                Card incomplete
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-tight">
            {event.name}
          </h1>
          {event.organization && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> {event.organization}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(event.date), 'EEEE, MMMM d, yyyy · h:mm a')}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {event.venue ? `${event.venue}, ${event.location}` : event.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card incomplete warning */}
      {isPartial && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Card incomplete — additional data required</p>
            <p className="text-xs text-muted-foreground mt-1">
              {quarantinedCount > 0 && `${quarantinedCount} fights could not be verified. `}
              {needsReview.length > 0 && `${needsReview.length} fights under review.`}
            </p>
          </div>
        </div>
      )}

      {/* Fight Card */}
      {displayableFights.length > 0 ? (
        <div className="space-y-6">
          {sections.filter(section => section.bouts.length).map(section => (
            <div key={section.label}>
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">
                {section.label}
              </h2>
              {section.startsAt && <p className="mb-3 text-sm text-muted-foreground">{format(new Date(section.startsAt), 'MMM d · h:mm a')}</p>}
              <div className="space-y-3">
                {section.bouts.map(f => (
                  <FightCard key={f.fight.id} fight={f.fight} verificationTier={f.verification.tier} fighters={fighters} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No fights announced yet" />
      )}
    </div>
  );
}
