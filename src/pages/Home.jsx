import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Flame, Calendar, Trophy, Clock, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isSameDay, parseISO, startOfDay, addDays } from 'date-fns';
import FighterAvatar from '@/components/shared/FighterAvatar';
import DisciplineBadge from '@/components/shared/DisciplineBadge';
import { cn } from '@/lib/utils';
import { categorizeFights, categorizeEvents, filterDisplayableUpcomingFights } from '@/lib/dataGating';

function FightRow({ fight, event, fighters }) {
  const navigate = useNavigate();
  const isCompleted = fight.status === 'completed';
  const aWon = fight.winner_name === fight.fighter_a_name;
  const bWon = fight.winner_name === fight.fighter_b_name;

  const fighterA = fighters.find(f => f.name === fight.fighter_a_name);
  const fighterB = fighters.find(f => f.name === fight.fighter_b_name);

  return (
    <div onClick={() => navigate(`/fights/${fight.id}`)} className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-primary/30 cursor-pointer',
      isCompleted ? 'border-border/40 bg-muted/10 opacity-80' : 'border-border/60 bg-card/50',
      fight.status === 'live' && 'border-red-500/40 bg-red-500/5',
    )}>
      {/* Fighter A */}
      <div className={cn('flex items-center gap-2 flex-1 justify-end', isCompleted && !aWon && 'opacity-40')}>
        <div className="text-right hidden sm:block">
          <p className={cn('font-heading text-sm font-bold uppercase tracking-wide truncate max-w-[100px]', aWon && 'text-primary')}>
            {fight.fighter_a_name?.split(' ').pop()}
          </p>
          {fighterA && <p className="text-[9px] text-muted-foreground">{fighterA.wins}-{fighterA.losses}</p>}
        </div>
        <FighterAvatar fighter={fighterA || { name: fight.fighter_a_name }} size="sm" />
      </div>

      {/* Center */}
      <div className="flex flex-col items-center shrink-0 min-w-[80px]">
        {isCompleted && fight.method ? (
          <div className="text-center">
            <p className="text-[10px] font-bold text-primary">{fight.winner_name?.split(' ').pop()}</p>
            <p className="text-[9px] text-muted-foreground">{fight.method} R{fight.finish_round}</p>
          </div>
        ) : fight.status === 'live' ? (
          <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
          </span>
        ) : (
          <span className="text-xs font-bold text-muted-foreground">VS</span>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          {fight.weight_class && (
            <span className="text-[9px] text-muted-foreground hidden sm:block">{fight.weight_class}</span>
          )}
        </div>
      </div>

      {/* Fighter B */}
      <div className={cn('flex items-center gap-2 flex-1', isCompleted && !bWon && 'opacity-40')}>
        <FighterAvatar fighter={fighterB || { name: fight.fighter_b_name }} size="sm" />
        <div className="hidden sm:block">
          <p className={cn('font-heading text-sm font-bold uppercase tracking-wide truncate max-w-[100px]', bWon && 'text-primary')}>
            {fight.fighter_b_name?.split(' ').pop()}
          </p>
          {fighterB && <p className="text-[9px] text-muted-foreground">{fighterB.wins}-{fighterB.losses}</p>}
        </div>
      </div>

      {/* Meta */}
      <div className="shrink-0 text-right hidden md:block">
        <DisciplineBadge discipline={fight.discipline} />
        {event && <p className="text-[9px] text-muted-foreground mt-1">{event.organization || event.name}</p>}
      </div>
    </div>
  );
}

function DaySection({ date, fights, events, fighters }) {
  const isToday = isSameDay(date, new Date());
  const completedFights = fights.filter(f => f.status === 'completed');
  const activeFights = fights.filter(f => f.status !== 'completed');
  const sortedFights = [...activeFights, ...completedFights];

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className={cn('font-heading text-lg font-bold uppercase tracking-wide', isToday && 'text-primary')}>
          {isToday ? 'Today' : format(date, 'EEEE, MMMM d')}
        </h3>
        {isToday && <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">TODAY</span>}
        <div className="flex-1 h-px bg-border/40" />
        <span className="text-xs text-muted-foreground">{fights.length} fight{fights.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Group by event */}
      {Object.entries(
        sortedFights.reduce((groups, fight) => {
          const key = fight.event_id || 'standalone';
          if (!groups[key]) groups[key] = [];
          groups[key].push(fight);
          return groups;
        }, {})
      ).map(([eventId, eventFights]) => {
        const event = events.find(e => e.id === eventId);
        return (
          <div key={eventId} className="mb-4">
            {event && (
              <div className="flex items-center gap-2 mb-2 pl-1">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground">{event.organization ? `${event.organization} · ` : ''}{event.name}</span>
                {event.venue && <span className="text-[10px] text-muted-foreground/60 hidden sm:block">· {event.venue}</span>}
              </div>
            )}
            <div className="space-y-2">
              {eventFights.map(fight => (
                <FightRow key={fight.id} fight={fight} event={event} fighters={fighters} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const dateBarRef = useRef(null);
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date', 50),
  });

  const { data: fights = [], isLoading: fightsLoading } = useQuery({
    queryKey: ['all-fights-home'],
    queryFn: () => base44.entities.Fight.list('order', 200),
  });

  const { data: fighters = [] } = useQuery({
    queryKey: ['fighters'],
    queryFn: () => base44.entities.Fighter.list('name', 200),
  });

  const isLoading = eventsLoading || fightsLoading;

  // Real outcomes must be imported from verified sources, never inferred from elapsed time.

  // fightDays defined above with allDisplayableFights

  // Generate date bar: today -2 to +14, highlight days with fights
  const dateBarDays = Array.from({ length: 20 }, (_, i) => addDays(today, i - 2));

  // Categorize all data through verification
  const { verified: verifiedFights, needsReview: reviewFights } = categorizeFights(fights, events, fighters);
  const { verified: verifiedEvents, partial: partialEvents } = categorizeEvents(events, fights, fighters);

  // All displayable fights (verified + admin_review)
  const allDisplayableFights = [...verifiedFights.map(v => v.fight), ...reviewFights.map(r => r.fight)];

  // Fights for selected date — includes admin_review fights with results
  const now = new Date();
  const isPastDate = selectedDate < startOfDay(now);
  const fightsOnDate = allDisplayableFights.filter(f => {
    const event = events.find(e => e.id === f.event_id);
    if (!event?.date) return false;
    return isSameDay(parseISO(event.date), selectedDate);
  });

  // Upcoming fights — verified only (admin_review not shown in upcoming preview)
  const upcomingFights = filterDisplayableUpcomingFights(fights, events, fighters)
    .sort((a, b) => {
      const ea = events.find(e => e.id === a.event_id);
      const eb = events.find(e => e.id === b.event_id);
      return new Date(ea?.date || 0) - new Date(eb?.date || 0);
    })
    .slice(0, 8);

  // Partial upcoming events — show with "needs data" warning
  const partialUpcomingEvents = partialEvents.filter(p => {
    if (!p.event.date) return false;
    return new Date(p.event.date) >= startOfDay(now) && p.event.status !== 'completed';
  });

  const liveEvents = events.filter(e => e.status === 'live');

  // Build fight days for date bar — use ALL displayable fights (for date dot indicators)
  const fightDays = [...new Set(
    allDisplayableFights
      .filter(f => {
        const event = events.find(e => e.id === f.event_id);
        return event?.date;
      })
      .map(f => {
        const event = events.find(e => e.id === f.event_id);
        return startOfDay(parseISO(event.date)).getTime();
      })
  )].sort().map(t => new Date(t));

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24 md:pb-8">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="flex gap-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-14 rounded-xl shrink-0" />)}</div>
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      {/* Live Banner */}
      {liveEvents.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <Flame className="w-4 h-4 text-red-400" />
          <p className="text-sm font-semibold">
            {liveEvents.map(e => e.name).join(', ')} — <span className="text-red-400">LIVE NOW</span>
          </p>
          <Link to="/fights" className="ml-auto text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
            Watch <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Day-by-day Fight Schedule */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Fight Schedule</h2>
          </div>
          <Link to="/fights" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            All fights <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Date Bar */}
        <div ref={dateBarRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-5">
          {dateBarDays.map(day => {
            const hasFights = fightDays.some(d => isSameDay(d, day));
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            return (
              <button
                key={day.getTime()}
                onClick={() => setSelectedDate(startOfDay(day))}
                className={cn(
                  'shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all min-w-[56px]',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : isToday
                      ? 'border-primary/40 bg-primary/5 text-foreground'
                      : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider">{format(day, 'EEE')}</span>
                <span className={cn('text-base font-bold font-heading', isSelected && 'text-primary-foreground')}>{format(day, 'd')}</span>
                {hasFights && (
                  <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-primary-foreground' : 'bg-primary')} />
                )}
              </button>
            );
          })}
        </div>

        {/* Fights on selected date */}
        {fightsOnDate.length > 0 ? (
          <DaySection date={selectedDate} fights={fightsOnDate} events={events} fighters={fighters} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-xl border border-border/40 bg-card/30">
            <Calendar className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No fights on {format(selectedDate, 'MMMM d')}</p>
            {upcomingFights.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Next fight: {format(parseISO(events.find(e => e.id === upcomingFights[0]?.event_id)?.date || new Date().toISOString()), 'MMM d')}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Upcoming Fights Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Upcoming Fights</h2>
          </div>
        </div>

        {upcomingFights.length === 0 && partialUpcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-border/40 bg-card/30">
            <Trophy className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No upcoming fights scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Verified upcoming fights */}
            {upcomingFights.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingFights.map(fight => {
                  const event = events.find(e => e.id === fight.event_id);
                  const fighterA = fighters.find(f => f.name === fight.fighter_a_name);
                  const fighterB = fighters.find(f => f.name === fight.fighter_b_name);
                  return (
                    <button
                      key={fight.id}
                      onClick={() => {
                        if (event?.date) setSelectedDate(startOfDay(parseISO(event.date)));
                      }}
                      className="rounded-xl border border-border/60 bg-card/50 p-4 text-left hover:border-primary/30 hover:bg-card/80 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <FighterAvatar fighter={fighterA || { name: fight.fighter_a_name }} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-sm font-bold uppercase tracking-wide truncate">
                            {fight.fighter_a_name} <span className="text-primary">vs</span> {fight.fighter_b_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <DisciplineBadge discipline={fight.discipline} />
                            {event && <span className="text-[9px] text-muted-foreground">{event.organization || event.name}</span>}
                          </div>
                        </div>
                        <FighterAvatar fighter={fighterB || { name: fight.fighter_b_name }} size="sm" />
                      </div>
                      {event?.date && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {format(parseISO(event.date), 'MMM d, yyyy')}
                          {fight.is_main_event && <span className="ml-2 text-primary font-semibold">· Main Event</span>}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Partial events — show with warning */}
            {partialUpcomingEvents.map(p => (
              <div key={p.event.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold font-heading uppercase text-amber-400">{p.event.name}</span>
                  <DisciplineBadge discipline={p.event.discipline} />
                </div>
                <p className="text-xs text-muted-foreground">{p.event.date ? format(parseISO(p.event.date), 'MMM d, yyyy') : 'TBA'} · {p.event.venue || 'Venue TBA'}</p>
                <p className="text-xs text-amber-400/80 mt-2 font-medium">
                  Card incomplete — additional data required
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}