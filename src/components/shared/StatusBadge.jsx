import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  upcoming: 'bg-blue-500/15 text-blue-400',
  scheduled: 'bg-blue-500/15 text-blue-400',
  live: 'bg-red-500/20 text-red-400 animate-pulse',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-yellow-500/15 text-yellow-400',
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
      STATUS_STYLES[status] || 'bg-muted text-muted-foreground'
    )}>
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
      {status}
    </span>
  );
}