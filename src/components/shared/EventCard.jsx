import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Clock, ChevronRight } from 'lucide-react';
import DisciplineBadge from './DisciplineBadge';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';
import { DISPLAY_TIER } from '@/lib/verification';

export default function EventCard({ event, compact = false, verificationTier }) {
  const isPartial = verificationTier === DISPLAY_TIER.PARTIAL_EVENT_NEEDS_DATA;
  const isReview = verificationTier === DISPLAY_TIER.ADMIN_REVIEW;

  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        "group block rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/30 hover:bg-card/80",
        event.status === 'live' && "border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.06)]",
        isPartial && "border-amber-500/30",
        isReview && "border-red-500/20",
      )}
    >
      {event.image_url && !compact && (
        <div className="h-40 overflow-hidden">
          <img
            src={event.image_url}
            alt={event.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <DisciplineBadge discipline={event.discipline} />
          <div className="flex items-center gap-1.5">
            {isPartial && (
              <span className="text-[9px] font-semibold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                Incomplete card
              </span>
            )}
            {isReview && (
              <span className="text-[9px] font-semibold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">
                Under review
              </span>
            )}
            <StatusBadge status={event.status} />
          </div>
        </div>
        <h3 className="font-heading text-lg font-bold uppercase tracking-wide mt-2 group-hover:text-primary transition-colors">
          {event.name}
        </h3>
        {event.organization && (
          <p className="text-xs text-muted-foreground mt-1">{event.organization}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(event.date), 'MMM d, yyyy')}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {event.location}
            </span>
          )}
        </div>
        {isPartial && (
          <p className="text-xs text-amber-400/80 mt-2 font-medium">
            Card incomplete — additional data required
          </p>
        )}
        <div className="flex items-center justify-end mt-3">
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
            View card <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}