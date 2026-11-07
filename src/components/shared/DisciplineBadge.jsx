import { cn } from '@/lib/utils';

const DISCIPLINE_COLORS = {
  'MMA': 'bg-red-500/15 text-red-400 border-red-500/20',
  'Boxing': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'BJJ': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Muay Thai': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'Kickboxing': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Wrestling': 'bg-green-500/15 text-green-400 border-green-500/20',
  'Judo': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  'Karate': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'Taekwondo': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'Kung Fu / Wushu': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

export default function DisciplineBadge({ discipline, className }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider",
      DISCIPLINE_COLORS[discipline] || 'bg-muted text-muted-foreground border-border',
      className
    )}>
      {discipline}
    </span>
  );
}