import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { refreshFighterData } from '@/lib/dataService';
import { INTEGRATION_GUIDE, getRequiredApiKeys, getScraperPlaceholders } from '@/lib/integrationGuide';
import { RefreshCw, ExternalLink, Key, Code, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import DataIntegrityPanel from '@/components/admin/DataIntegrityPanel';
import ImageReviewPanel from '@/components/admin/ImageReviewPanel';

const STATUS_STYLES = {
  api: 'bg-green-500/10 text-green-400 border-green-500/20',
  api_key_required: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  api_key_optional: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  free: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  scraper: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  manual: 'bg-muted text-muted-foreground border-border',
  manual_or_scraper: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const STATUS_LABELS = {
  api: '✅ Free API',
  api_key_required: '🔑 API Key Required',
  api_key_optional: '🔑 Key Optional',
  free: '✅ Free',
  scraper: '🕷️ Scraper Needed',
  manual: '📋 Manual',
  manual_or_scraper: '🕷️ Scraper/Manual',
};

export default function DataAdmin() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('fighters');
  const [refreshingId, setRefreshingId] = useState(null);
  const [search, setSearch] = useState('');
  const [editFighter, setEditFighter] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data: fighters = [], isLoading: fightersLoading } = useQuery({
    queryKey: ['fighters-admin'],
    queryFn: () => base44.entities.Fighter.list('name', 200),
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list('name', 200),
  });

  const updateFighter = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fighter.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['fighters-admin']); setEditFighter(null); },
  });

  const handleRefreshFighter = async (fighter) => {
    setRefreshingId(fighter.id);
    await refreshFighterData(fighter);
    await qc.invalidateQueries(['fighters-admin']);
    setRefreshingId(null);
  };

  const filteredFighters = fighters.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const apiKeys = getRequiredApiKeys();
  const scrapers = getScraperPlaceholders();

  const TABS = [
    { id: 'fighters', label: 'Fighters' },
    { id: 'integrity', label: 'Data Integrity' },
    { id: 'images', label: 'Images' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'api_keys', label: 'API Keys' },
    { id: 'scrapers', label: 'Scrapers' },
  ];

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Data Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage fighters, integrations, and data sources</p>
      </div>

      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all",
              activeTab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Fighters Tab ── */}
      {activeTab === 'fighters' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fighters..." className="w-full pl-10 bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <span className="text-xs text-muted-foreground">{filteredFighters.length} fighters</span>
          </div>

          {fightersLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {filteredFighters.map(f => (
                <div key={f.id} className="rounded-xl border border-border/40 bg-card/40 p-3">
                  {editFighter === f.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {['name','nickname','nationality','weight_class','wins','losses','draws','preferred_profile_image_url','image_url','image_source_type','ufc_url','wikipedia_url','wikidata_id','thesportsdb_id','tapology_url','sherdog_url','biography'].map(field => (
                          <div key={field} className={field === 'biography' ? 'col-span-2' : ''}>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">{field.replace(/_/g,' ')}</label>
                            {field === 'biography' ? (
                              <textarea value={editForm[field] || ''} onChange={e => setEditForm(p => ({...p,[field]:e.target.value}))} className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm resize-none" rows={3} />
                            ) : (
                              <input value={editForm[field] || ''} onChange={e => setEditForm(p => ({...p,[field]:e.target.value}))} className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateFighter.mutate({ id: f.id, data: { ...editForm, data_quality: 'verified' } })} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Save</button>
                        <button onClick={() => setEditFighter(null)} className="px-4 py-2 rounded-lg border border-border/60 text-xs text-muted-foreground">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {f.image_url ? (
                        <img src={f.image_url} alt={f.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                          {f.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{f.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{f.discipline}</span>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', f.data_quality === 'verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-muted text-muted-foreground border-border')}>
                            {f.data_quality || 'stub'}
                          </span>
                          {!f.image_url && <span className="text-[10px] text-amber-400">No image</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleRefreshFighter(f)}
                          disabled={refreshingId === f.id}
                          className="p-2 rounded-lg border border-border/40 hover:bg-accent text-muted-foreground transition-all"
                          title="Refresh from external sources"
                        >
                          <RefreshCw className={cn('w-3.5 h-3.5', refreshingId === f.id && 'animate-spin')} />
                        </button>
                        <button
                          onClick={() => { setEditFighter(f.id); setEditForm(f); }}
                          className="px-3 py-1.5 rounded-lg border border-border/40 hover:bg-accent text-xs text-muted-foreground transition-all"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Data Integrity Tab ── */}
      {activeTab === 'integrity' && <DataIntegrityPanel />}

      {/* ── Images Tab ── */}
      {activeTab === 'images' && <ImageReviewPanel />}

      {/* ── Integrations Tab ── */}
      {activeTab === 'integrations' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">All configured data source endpoints and their current status.</p>
          {INTEGRATION_GUIDE.map((item, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm">{item.name || item.org}</p>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', STATUS_STYLES[item.status])}>
                      {STATUS_LABELS[item.status]}
                    </span>
                    {item.discipline && <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{item.discipline}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.notes}</p>
                  {item.endpoint && <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">{item.endpoint}</p>}
                </div>
                <a href={item.officialUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" /> Visit
                </a>
              </div>
              {item.fields && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {item.fields.map(f => (
                    <span key={f} className="text-[10px] bg-muted/40 border border-border/30 px-1.5 py-0.5 rounded text-muted-foreground">{f}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── API Keys Tab ── */}
      {activeTab === 'api_keys' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-bold text-amber-400">Required API Keys</p>
            </div>
            <p className="text-xs text-muted-foreground">Add these as secrets in your Base44 app settings → Secrets. Then they'll be accessible in backend functions.</p>
          </div>
          {apiKeys.map((k, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{k.service}</p>
                  <p className="text-[10px] font-mono text-primary mt-0.5">Secret name: {k.secretName}</p>
                </div>
                <a href={k.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Get Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground">{k.notes}</p>
            </div>
          ))}

          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-sm font-bold text-green-400 mb-2">✅ Free Sources (No Key Needed)</p>
            <ul className="space-y-1">
              <li className="text-xs text-muted-foreground">• <strong className="text-foreground/70">Wikidata SPARQL</strong> — Fighter data, images, nationalities</li>
              <li className="text-xs text-muted-foreground">• <strong className="text-foreground/70">Wikimedia Commons</strong> — Fighter images</li>
              <li className="text-xs text-muted-foreground">• <strong className="text-foreground/70">TheSportsDB (free tier)</strong> — Uses key "3", limited to basic lookups</li>
              <li className="text-xs text-muted-foreground">• <strong className="text-foreground/70">IJF Data API</strong> — Judo events at data.ijf.org</li>
              <li className="text-xs text-muted-foreground">• <strong className="text-foreground/70">UWW API</strong> — Wrestling events at uww.org/api</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Scrapers Tab ── */}
      {activeTab === 'scrapers' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-4 h-4 text-orange-400" />
              <p className="text-sm font-bold text-orange-400">Scraper Placeholders</p>
            </div>
            <p className="text-xs text-muted-foreground">These organizations have no public API. To get live data, you need a backend scraper service (e.g. Puppeteer, Playwright, or Apify). Each endpoint below is a placeholder you can wire to a real scraper.</p>
          </div>
          {scrapers.map((s, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{s.org || s.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{s.endpoint}</p>
                </div>
                <a href={s.officialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
                  <ExternalLink className="w-3 h-3" /> Site
                </a>
              </div>
              <p className="text-xs text-muted-foreground">{s.notes}</p>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fields to extract:</p>
                <div className="flex gap-1 flex-wrap">
                  {s.fields?.map(f => (
                    <span key={f} className="text-[10px] bg-muted/40 border border-border/30 px-1.5 py-0.5 rounded text-muted-foreground">{f}</span>
                  ))}
                </div>
              </div>
              {s.thesportsdb_league_id && (
                <p className="text-[10px] text-blue-400">💡 TheSportsDB alternative: League ID <strong>{s.thesportsdb_league_id}</strong></p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}