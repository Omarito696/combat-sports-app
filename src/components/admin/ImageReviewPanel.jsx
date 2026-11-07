/**
 * ImageReviewPanel
 * Admin tool to review, approve, reject, or override fighter profile images.
 * Enforces the image source priority order:
 *   1. preferred_profile_image_url (admin-set)
 *   2. official_org
 *   3. media_day / publicity_headshot
 *   4. sports_db
 *   5. wikipedia / wikimedia (fallback only)
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, X, AlertTriangle, Image, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const SOURCE_PRIORITY = ['official_org', 'media_day', 'publicity_headshot', 'sports_db', 'wikipedia', 'wikimedia', 'unknown'];
const SOURCE_LABELS = {
  official_org: { label: 'Official Org', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  media_day: { label: 'Media Day', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  publicity_headshot: { label: 'Publicity Shot', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  sports_db: { label: 'Sports DB', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  wikipedia: { label: 'Wikipedia', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  wikimedia: { label: 'Wikimedia', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  unknown: { label: 'Unknown', color: 'text-muted-foreground bg-muted border-border' },
};
const CONFIDENCE_COLORS = {
  approved: 'text-green-400 bg-green-500/10 border-green-500/20',
  auto: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  unverified: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export default function ImageReviewPanel() {
  const qc = useQueryClient();
  const [overrideFighterId, setOverrideFighterId] = useState(null);
  const [overrideUrl, setOverrideUrl] = useState('');
  const [overrideSourceType, setOverrideSourceType] = useState('official_org');
  const [filter, setFilter] = useState('all'); // all | needs_review | rejected | no_image

  const { data: fighters = [], isLoading } = useQuery({
    queryKey: ['fighters-image-review'],
    queryFn: () => base44.entities.Fighter.list('name', 500),
  });

  const updateFighter = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fighter.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['fighters-image-review']);
      qc.invalidateQueries(['fighters-admin']);
      qc.invalidateQueries(['fighters']);
    },
  });

  const handleApprove = (fighter) => {
    updateFighter.mutate({
      id: fighter.id,
      data: {
        image_confidence: 'approved',
        image_pending_review: false,
        image_last_verified_at: new Date().toISOString(),
      }
    });
  };

  const handleReject = (fighter) => {
    updateFighter.mutate({
      id: fighter.id,
      data: {
        image_confidence: 'rejected',
        image_pending_review: false,
        image_url: null,
        image_source: null,
        image_source_type: null,
      }
    });
  };

  const handleSetOverride = (fighter) => {
    if (!overrideUrl.trim()) return;
    updateFighter.mutate({
      id: fighter.id,
      data: {
        preferred_profile_image_url: overrideUrl.trim(),
        image_source_type: overrideSourceType,
        image_confidence: 'approved',
        image_pending_review: false,
        image_last_verified_at: new Date().toISOString(),
      }
    });
    setOverrideFighterId(null);
    setOverrideUrl('');
  };

  const handleClearOverride = (fighter) => {
    updateFighter.mutate({
      id: fighter.id,
      data: {
        preferred_profile_image_url: null,
        image_confidence: 'unverified',
      }
    });
  };

  const filtered = fighters.filter(f => {
    if (filter === 'needs_review') return f.image_pending_review || f.image_confidence === 'unverified';
    if (filter === 'rejected') return f.image_confidence === 'rejected';
    if (filter === 'no_image') return !f.preferred_profile_image_url && !f.image_url;
    return true;
  });

  const pendingCount = fighters.filter(f => f.image_pending_review || f.image_confidence === 'unverified').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Approved', key: 'approved', color: 'text-green-400', count: fighters.filter(f => f.image_confidence === 'approved').length },
          { label: 'Needs Review', key: 'needs_review', color: 'text-amber-400', count: pendingCount },
          { label: 'Rejected', key: 'rejected', color: 'text-red-400', count: fighters.filter(f => f.image_confidence === 'rejected').length },
          { label: 'No Image', key: 'no_image', color: 'text-muted-foreground', count: fighters.filter(f => !f.preferred_profile_image_url && !f.image_url).length },
        ].map(stat => (
          <button key={stat.key}
            onClick={() => setFilter(filter === stat.key ? 'all' : stat.key)}
            className={cn(
              'rounded-xl border p-3 text-left transition-all',
              filter === stat.key ? 'border-primary/40 bg-primary/5' : 'border-border/40 bg-card/40 hover:border-border'
            )}>
            <p className={cn('text-xl font-bold font-heading', stat.color)}>{stat.count}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border/30 bg-card/20">
        <p className="text-[10px] text-muted-foreground w-full font-semibold uppercase tracking-wider mb-1">Image Source Priority (highest → lowest)</p>
        {SOURCE_PRIORITY.map(s => {
          const meta = SOURCE_LABELS[s];
          return (
            <span key={s} className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', meta.color)}>
              {meta.label}
            </span>
          );
        })}
      </div>

      {/* Fighter list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No fighters match this filter</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(fighter => {
            const displayImg = fighter.preferred_profile_image_url || fighter.image_url;
            const srcMeta = SOURCE_LABELS[fighter.image_source_type] || SOURCE_LABELS.unknown;
            const confColor = CONFIDENCE_COLORS[fighter.image_confidence] || CONFIDENCE_COLORS.unverified;
            const isOverriding = overrideFighterId === fighter.id;

            return (
              <div key={fighter.id} className="rounded-xl border border-border/40 bg-card/40 p-4">
                <div className="flex items-start gap-4">
                  {/* Image preview */}
                  <div className="w-16 h-20 rounded-lg overflow-hidden border border-border/40 bg-muted shrink-0">
                    {displayImg ? (
                      <img src={displayImg} alt={fighter.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{fighter.name}</p>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', confColor)}>
                        {fighter.image_confidence || 'unverified'}
                      </span>
                      {fighter.preferred_profile_image_url && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border text-green-400 bg-green-500/10 border-green-500/20">
                          Admin Override Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{fighter.discipline} · {fighter.weight_class}</span>
                      {fighter.image_source_type && (
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', srcMeta.color)}>
                          {srcMeta.label}
                        </span>
                      )}
                      {fighter.image_source && !fighter.image_source_type && (
                        <span className="text-[10px] text-muted-foreground">{fighter.image_source}</span>
                      )}
                    </div>
                    {fighter.image_last_verified_at && (
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                        Verified: {new Date(fighter.image_last_verified_at).toLocaleDateString()}
                      </p>
                    )}
                    {/* Warning for wikipedia/wikimedia as current source */}
                    {(fighter.image_source_type === 'wikipedia' || fighter.image_source_type === 'wikimedia' ||
                      fighter.image_source === 'wikipedia' || fighter.image_source === 'wikimedia') && !fighter.preferred_profile_image_url && (
                      <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Using Wikipedia fallback — consider adding an official image
                      </p>
                    )}

                    {/* Override form */}
                    {isOverriding && (
                      <div className="mt-3 space-y-2">
                        <input
                          value={overrideUrl}
                          onChange={e => setOverrideUrl(e.target.value)}
                          placeholder="Paste official image URL…"
                          className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-xs"
                        />
                        <select
                          value={overrideSourceType}
                          onChange={e => setOverrideSourceType(e.target.value)}
                          className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-xs"
                        >
                          {SOURCE_PRIORITY.map(s => (
                            <option key={s} value={s}>{SOURCE_LABELS[s].label}</option>
                          ))}
                        </select>
                        {overrideUrl && (
                          <img src={overrideUrl} alt="preview" className="w-16 h-20 object-cover object-top rounded-lg border border-border/40" onError={e => e.target.style.display='none'} />
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => handleSetOverride(fighter)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Set Override</button>
                          <button onClick={() => { setOverrideFighterId(null); setOverrideUrl(''); }} className="px-3 py-1.5 rounded-lg border border-border/40 text-xs text-muted-foreground">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isOverriding && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {displayImg && fighter.image_confidence !== 'approved' && (
                        <button onClick={() => handleApprove(fighter)} title="Approve image"
                          className="p-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {displayImg && fighter.image_confidence !== 'rejected' && (
                        <button onClick={() => handleReject(fighter)} title="Reject image"
                          className="p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => { setOverrideFighterId(fighter.id); setOverrideUrl(fighter.preferred_profile_image_url || ''); }}
                        title="Set official image override"
                        className="p-2 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      {fighter.preferred_profile_image_url && (
                        <button onClick={() => handleClearOverride(fighter)} title="Clear admin override"
                          className="p-2 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all text-[9px] font-bold">
                          CLR
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}