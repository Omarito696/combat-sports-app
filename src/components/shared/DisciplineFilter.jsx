import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const DISCIPLINES = [
  'All',
  'MMA',
  'Boxing',
  'BJJ',
  'Muay Thai',
  'Kickboxing',
  'Wrestling',
  'Judo',
  'Karate',
  'Taekwondo',
  'Kung Fu / Wushu',
];

export default function DisciplineFilter({ selected, onSelect }) {
  return (
    <ScrollArea className="w-full">
      <div className="flex items-center gap-2 pb-2">
        {DISCIPLINES.map((d) => (
          <button
            key={d}
            onClick={() => onSelect(d === 'All' ? null : d)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border transition-all duration-200",
              (d === 'All' && !selected) || selected === d
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/50 text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground"
            )}
          >
            {d}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}