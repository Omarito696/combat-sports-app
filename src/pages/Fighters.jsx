import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import DisciplineFilter from '@/components/shared/DisciplineFilter';
import DisciplineBadge from '@/components/shared/DisciplineBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import FighterAvatar from '@/components/shared/FighterAvatar';

export default function Fighters() {
  const [discipline, setDiscipline] = useState(null);
  const [search, setSearch] = useState('');

  const { data: fighters = [], isLoading } = useQuery({
    queryKey: ['fighters'],
    queryFn: () => base44.entities.Fighter.list('name', 200),
  });

  const filtered = fighters.filter(f => {
    const dMatch = !discipline || f.discipline === discipline;
    const sMatch = !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.nickname && f.nickname.toLowerCase().includes(search.toLowerCase()));
    return dMatch && sMatch;
  });

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Fighters</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse the fighter database</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search fighters..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-card/50 border-border/60"
        />
      </div>

      <DisciplineFilter selected={discipline} onSelect={setDiscipline} />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(fighter => (
            <Link
              key={fighter.id}
              to={`/fighters/${encodeURIComponent(fighter.name)}`}
              className="group rounded-xl border border-border/60 bg-card/50 p-4 transition-all duration-300 hover:border-primary/30 hover:bg-card/80 block"
            >
              <div className="flex items-start gap-3">
                <FighterAvatar fighter={fighter} size="sm" className="rounded-xl" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-base font-bold uppercase tracking-wide truncate group-hover:text-primary transition-colors">
                    {fighter.name}
                  </h3>
                  {fighter.nickname && (
                    <p className="text-xs text-muted-foreground italic">"{fighter.nickname}"</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <DisciplineBadge discipline={fighter.discipline} />
                    {fighter.weight_class && (
                      <span className="text-[10px] text-muted-foreground">{fighter.weight_class}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-green-400">{fighter.wins || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wins</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-red-400">{fighter.losses || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Losses</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-muted-foreground">{fighter.draws || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Draws</p>
                </div>
                {fighter.ranking && (
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-amber-400">#{fighter.ranking}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rank</p>
                  </div>
                )}
              </div>

              {fighter.nationality && (
                <p className="text-[10px] text-muted-foreground mt-2">{fighter.nationality}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState message="No fighters match your search" />
      )}
    </div>
  );
}