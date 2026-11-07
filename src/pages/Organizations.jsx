import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DisciplineFilter from '@/components/shared/DisciplineFilter';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import DisciplineBadge from '@/components/shared/DisciplineBadge';

const TIER_STYLES = {
  Major: 'bg-primary/10 text-primary border-primary/20',
  Regional: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Minor: 'bg-muted text-muted-foreground border-border',
};

export default function Organizations() {
  const [discipline, setDiscipline] = useState(null);
  const [tier, setTier] = useState('all');

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list('name', 200),
  });

  const filtered = orgs.filter(o => {
    const dMatch = !discipline || o.discipline === discipline;
    const tMatch = tier === 'all' || o.tier === tier;
    return dMatch && tMatch;
  });

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Organizations</h1>
        <p className="text-sm text-muted-foreground mt-1">All tracked promotions across every discipline</p>
      </div>

      <DisciplineFilter selected={discipline} onSelect={setDiscipline} />

      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {['all', 'Major', 'Regional', 'Minor'].map(t => (
          <button key={t} onClick={() => setTier(t)}
            className={cn("px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all",
              tier === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(org => (
            <div key={org.id} className="rounded-xl border border-border/60 bg-card/50 p-4 hover:border-primary/20 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {org.logo_url
                    ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-contain p-1" />
                    : <Building2 className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-sm font-bold uppercase tracking-wide truncate">{org.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <DisciplineBadge discipline={org.discipline} />
                    {org.tier && (
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", TIER_STYLES[org.tier])}>
                        {org.tier}
                      </span>
                    )}
                  </div>
                  {org.country && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Globe className="w-3 h-3" />{org.country}</p>}
                  {org.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{org.description}</p>}
                </div>
              </div>
              {org.website && (
                <a href={org.website} target="_blank" rel="noopener noreferrer"
                  className="mt-3 block text-xs text-primary hover:underline truncate">
                  {org.website}
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No organizations found" />
      )}
    </div>
  );
}