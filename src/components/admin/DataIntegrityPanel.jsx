/**
 * DataIntegrityPanel
 * Shows fighter data integrity warnings, cross-contamination issues,
 * and allows admin to fix or flag records for review.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { auditFighters } from '@/lib/fighterMatcher';
import { runDailyCleanup } from '@/lib/staleDataCleanup';
import { AlertTriangle, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DataIntegrityPanel() {
  const qc = useQueryClient();
  const [cleanupResult, setCleanupResult] = useState(null);
  const [runningCleanup, setRunningCleanup] = useState(false);

  const { data: fighters = [], isLoading } = useQuery({
    queryKey: ['fighters-integrity'],
    queryFn: () => base44.entities.Fighter.list('name', 500),
  });

  const fixFighter = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fighter.update(id, data),
    onSuccess: () => qc.invalidateQueries(['fighters-integrity']),
  });

  const issues = auditFighters(fighters);

  const handleCleanup = async () => {
    setRunningCleanup(true);
    setCleanupResult(null);
    const result = await runDailyCleanup();
    setCleanupResult(result);
    setRunningCleanup(false);
    qc.invalidateQueries(['all-fights-home']);
    qc.invalidateQueries(['events']);
  };

  const handleFlagForReview = (fighter) => {
    fixFighter.mutate({
      id: fighter.id,
      data: { needs_admin_review: true, data_confidence: 'low' }
    });
  };

  return (
    <div className="space-y-5">
      {/* Stale Data Cleanup */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-sm">Stale Event & Fight Cleanup</p>
            <p className="text-xs text-muted-foreground mt-0.5">Mark past events/fights as completed. Run daily or on demand.</p>
          </div>
          <button
            onClick={handleCleanup}
            disabled={runningCleanup}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', runningCleanup && 'animate-spin')} />
            {runningCleanup ? 'Running…' : 'Run Cleanup'}
          </button>
        </div>
        {cleanupResult && (
          <div className="rounded-lg bg-muted/30 border border-border/40 p-3 text-xs space-y-1">
            <p className="text-green-400 font-semibold">
              ✅ Fixed {cleanupResult.eventsFixed} event{cleanupResult.eventsFixed !== 1 ? 's' : ''} and {cleanupResult.fightsFixed} fight{cleanupResult.fightsFixed !== 1 ? 's' : ''}
            </p>
            {cleanupResult.warnings.map((w, i) => (
              <p key={i} className="text-amber-400">⚠ {w}</p>
            ))}
          </div>
        )}
      </div>

      {/* Data Integrity Issues */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <p className="font-semibold text-sm">Data Integrity Audit</p>
          {!isLoading && (
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              issues.length === 0
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            )}>
              {issues.length === 0 ? 'No issues' : `${issues.length} issue${issues.length !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading fighters…</p>
        ) : issues.length === 0 ? (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-green-500/20 bg-green-500/5">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-sm text-green-400">No data integrity issues found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue, i) => (
              <div key={i} className={cn(
                'rounded-xl border p-4 space-y-3',
                issue.severity === 'error'
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              )}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0', issue.severity === 'error' ? 'text-red-400' : 'text-amber-400')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-bold uppercase tracking-wider', issue.severity === 'error' ? 'text-red-400' : 'text-amber-400')}>
                      {issue.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm mt-0.5">{issue.message}</p>
                  </div>
                </div>

                {/* Affected fighters with quick-fix buttons */}
                <div className="space-y-2 pl-6">
                  {issue.fighters.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg bg-background/40 border border-border/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Record: {f.wins ?? '?'}-{f.losses ?? '?'} · {f.discipline} · {f.weight_class || 'unknown weight class'}
                          {f.data_confidence && <span className={cn('ml-2 font-bold', f.data_confidence === 'high' ? 'text-green-400' : f.data_confidence === 'medium' ? 'text-amber-400' : 'text-red-400')}>
                            [{f.data_confidence} confidence]
                          </span>}
                        </p>
                        {f.wikidata_id && <p className="text-[9px] text-muted-foreground/60">Wikidata: {f.wikidata_id}</p>}
                      </div>
                      <button
                        onClick={() => handleFlagForReview(f)}
                        className="shrink-0 px-2 py-1 rounded-lg border border-amber-500/30 text-[10px] text-amber-400 hover:bg-amber-500/10 transition-all"
                      >
                        Flag Review
                      </button>
                    </div>
                  ))}
                </div>

                {/* Specific fix suggestion for cross-contamination */}
                {issue.type === 'CROSS_CONTAMINATION' && (
                  <div className="pl-6">
                    <p className="text-[10px] text-muted-foreground p-2 rounded-lg bg-background/30 border border-border/30">
                      💡 <strong>Fix:</strong> Go to each fighter's Edit form and manually verify/correct their W-L-D record against an authoritative source (UFC.com, Tapology, Sherdog). 
                      Then add their UFC URL or Tapology URL to lock in identity matching.
                      Ankalaev official record: ~20-1-1 · Alex Pereira official record: ~12-2
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fighters needing review */}
      {fighters.filter(f => f.needs_admin_review).length > 0 && (
        <div>
          <p className="font-semibold text-sm mb-3">Fighters Flagged for Review</p>
          <div className="space-y-2">
            {fighters.filter(f => f.needs_admin_review).map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.discipline} · {f.weight_class}</p>
                  {f.data_warnings?.map((w, i) => (
                    <p key={i} className="text-[10px] text-amber-400 mt-0.5">⚠ {w}</p>
                  ))}
                </div>
                <button
                  onClick={() => fixFighter.mutate({ id: f.id, data: { needs_admin_review: false, data_confidence: 'high' } })}
                  className="shrink-0 px-2 py-1 rounded-lg border border-green-500/30 text-[10px] text-green-400 hover:bg-green-500/10 transition-all"
                >
                  Mark OK
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}