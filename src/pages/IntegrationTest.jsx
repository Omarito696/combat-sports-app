import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Database, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEST_FIGHTER = 'Islam Makhachev';
const UFC_LEAGUE_ID = '4370';

function JsonBlock({ data }) {
  return (
    <pre className="bg-black/60 border border-border/40 rounded-lg p-3 text-[11px] font-mono text-green-300 overflow-auto max-h-64 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function TestCard({ title, endpoint, status, result, error, dbCount, dbNote, expanded, onToggle }) {
  const icon = status === 'running' ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
    : status === 'ok' ? <CheckCircle2 className="w-4 h-4 text-green-400" />
    : status === 'fail' ? <XCircle className="w-4 h-4 text-red-400" />
    : <div className="w-4 h-4 rounded-full border-2 border-border/60" />;

  return (
    <div className={cn("rounded-xl border bg-card/50",
      status === 'ok' && 'border-green-500/30',
      status === 'fail' && 'border-red-500/30',
      status === 'running' && 'border-amber-500/30',
      status === 'idle' && 'border-border/40',
    )}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">{endpoint}</p>
        </div>
        {dbCount !== undefined && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            <Database className="w-3 h-3" /> {dbCount} in DB
          </span>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          {dbNote && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
              <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{dbNote}</p>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-400 mb-1">ERROR</p>
                <p className="text-xs font-mono text-red-300 whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          )}
          {result !== undefined && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Raw Response</p>
              <JsonBlock data={result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntegrationTest() {
  const [tests, setTests] = useState({});
  const [expanded, setExpanded] = useState({});
  const [running, setRunning] = useState(false);
  const [dbCounts, setDbCounts] = useState({});

  function setTest(key, patch) {
    setTests(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
  }
  function toggle(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function runAllTests() {
    setRunning(true);
    setTests({});

    // ── DB counts first ──────────────────────────────────────────────────────
    const [fighters, events, newsArticles, videos, orgs] = await Promise.all([
      base44.entities.Fighter.list('name', 500).catch(() => []),
      base44.entities.Event.list('date', 500).catch(() => []),
      base44.entities.NewsArticle.list('-published_at', 500).catch(() => []),
      base44.entities.Video.list('-published_at', 500).catch(() => []),
      base44.entities.Organization.list('name', 200).catch(() => []),
    ]);

    const ufcEvents = events.filter(e => e.organization === 'UFC' || e.name?.includes('UFC'));
    const today = new Date();
    const upcomingUFC = ufcEvents.filter(e => e.date && new Date(e.date) >= today);
    const makhachevInDB = fighters.find(f => f.name?.toLowerCase().includes('makhachev'));
    const tsdbFighters = fighters.filter(f => f.thesportsdb_id);
    const wikimaFighters = fighters.filter(f => f.image_source === 'wikimedia' || f.wikidata_id);
    const recentNews = newsArticles.filter(a => {
      if (!a.published_at) return false;
      const d = new Date(a.published_at);
      return (today - d) / (1000 * 60 * 60 * 24) <= 30;
    });

    setDbCounts({
      fighters: fighters.length,
      events: events.length,
      news: newsArticles.length,
      videos: videos.length,
      orgs: orgs.length,
      ufcUpcoming: upcomingUFC.length,
      tsdbLinked: tsdbFighters.length,
      wikidataLinked: wikimaFighters.length,
      recentNews: recentNews.length,
    });

    // ── TEST 1: TheSportsDB — Fighter ────────────────────────────────────────
    setTest('tsdb_fighter', { status: 'running' });
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(TEST_FIGHTER)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      setTest('tsdb_fighter', {
        status: data?.player?.length ? 'ok' : 'fail',
        result: data,
        error: data?.player?.length ? null : 'Response returned null or empty player array',
        dbCount: tsdbFighters.length,
        dbNote: makhachevInDB
          ? `Islam Makhachev IS in DB (id: ${makhachevInDB.id}, data_quality: ${makhachevInDB.data_quality || 'stub'}, thesportsdb_id: ${makhachevInDB.thesportsdb_id || 'NOT SET'})`
          : `Islam Makhachev is NOT in the Fighter database. Add him manually or use Admin → Fighters to create a record.`,
      });
    } catch (e) {
      setTest('tsdb_fighter', { status: 'fail', error: String(e) });
    }

    // ── TEST 2: TheSportsDB — UFC Upcoming Events ───────────────────────────
    setTest('tsdb_events', { status: 'running' });
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${UFC_LEAGUE_ID}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      const now = new Date();
      const futureEvents = (data?.events || []).filter(e => {
        if (!e.dateEvent) return false;
        return new Date(e.dateEvent) >= now;
      });
      setTest('tsdb_events', {
        status: data?.events ? 'ok' : 'fail',
        result: data,
        error: data?.events ? null : 'No events returned. Free tier key "3" may not support this endpoint.',
        dbCount: upcomingUFC.length,
        dbNote: upcomingUFC.length
          ? `${upcomingUFC.length} upcoming UFC events in DB. Next: ${upcomingUFC[0]?.name} on ${upcomingUFC[0]?.date}`
          : 'No upcoming UFC events in DB. Events must be added manually or synced.',
      });
    } catch (e) {
      setTest('tsdb_events', { status: 'fail', error: String(e) });
    }

    // ── TEST 3: Wikidata — Islam Makhachev ──────────────────────────────────
    setTest('wikidata', { status: 'running' });
    try {
      const query = `
        SELECT ?item ?itemLabel ?image ?countryLabel ?dob ?wikiarticle WHERE {
          ?item wdt:P106 wd:Q13372570 .
          ?item rdfs:label "Islam Makhachev"@en .
          OPTIONAL { ?item wdt:P18 ?image . }
          OPTIONAL { ?item wdt:P27 ?country . }
          OPTIONAL { ?item wdt:P569 ?dob . }
          OPTIONAL {
            ?wikiarticle schema:about ?item .
            ?wikiarticle schema:isPartOf <https://en.wikipedia.org/> .
          }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
        } LIMIT 5
      `;
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'FightTracker/1.0' } });
      const data = await res.json();
      const bindings = data?.results?.bindings || [];
      setTest('wikidata', {
        status: bindings.length ? 'ok' : 'fail',
        result: data,
        error: bindings.length ? null : 'No results. Wikidata occupation filter (Q13372570 = martial artist) may not match. Try removing the occupation filter.',
        dbCount: wikimaFighters.length,
        dbNote: makhachevInDB?.wikidata_id
          ? `Islam Makhachev in DB with wikidata_id: ${makhachevInDB.wikidata_id}`
          : 'Islam Makhachev has no wikidata_id stored in DB yet. Use Admin → Fighters → Edit to set it, or Refresh to auto-fetch.',
      });
    } catch (e) {
      setTest('wikidata', { status: 'fail', error: String(e), result: null });
    }

    // ── TEST 4: Wikimedia Commons — image ───────────────────────────────────
    setTest('wikimedia', { status: 'running' });
    try {
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/Islam_Makhachev`;
      const res = await fetch(searchUrl, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      setTest('wikimedia', {
        status: data?.thumbnail?.source ? 'ok' : (data?.title ? 'ok' : 'fail'),
        result: data,
        error: data?.title ? null : 'Wikipedia page not found for Islam Makhachev',
        dbNote: makhachevInDB?.image_source === 'wikimedia'
          ? `DB fighter image IS from Wikimedia`
          : makhachevInDB?.image_url
            ? `DB fighter has image from source: ${makhachevInDB.image_source || 'unknown'}`
            : 'No image stored in DB for this fighter',
      });
    } catch (e) {
      setTest('wikimedia', { status: 'fail', error: String(e) });
    }

    // ── TEST 5: YouTube (via LLM internet search) ────────────────────────────
    setTest('youtube', { status: 'running' });
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search YouTube for the most recent videos about "Islam Makhachev" MMA fighter published in the last 30 days.
Return up to 5 results. Include: title, channelTitle, publishedAt (ISO date), videoId, thumbnailUrl.
IMPORTANT: Only include real YouTube videos that actually exist. Return format: { "videos": [...] }`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            videos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  channelTitle: { type: 'string' },
                  publishedAt: { type: 'string' },
                  videoId: { type: 'string' },
                  thumbnailUrl: { type: 'string' },
                },
              },
            },
          },
        },
      });
      const videoCount = result?.videos?.length || 0;
      setTest('youtube', {
        status: videoCount > 0 ? 'ok' : 'fail',
        result,
        error: videoCount > 0 ? null : 'LLM returned 0 videos. No YouTube API key is configured — using AI internet search as proxy. Real YouTube Data API v3 requires YOUTUBE_API_KEY secret.',
        dbCount: videos.length,
        dbNote: `${videos.length} total videos in DB. NOTE: YouTube calls are NOT stored in DB — results are live-fetched each time. To cache, add a "Save to DB" button.`,
      });
    } catch (e) {
      setTest('youtube', { status: 'fail', error: String(e) });
    }

    // ── TEST 6: News (via LLM internet search) ───────────────────────────────
    setTest('news', { status: 'running' });
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find real news articles about "Islam Makhachev" MMA fighter published after ${fromDate.toISOString().split('T')[0]}.
Return up to 8 results with: title, source (publication name), publishedAt (ISO date), url, summary (1-2 sentences).
IMPORTANT: Only include articles that actually exist with real URLs. Return format: { "articles": [...] }`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            articles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  source: { type: 'string' },
                  publishedAt: { type: 'string' },
                  url: { type: 'string' },
                  summary: { type: 'string' },
                },
              },
            },
          },
        },
      });
      const articleCount = result?.articles?.length || 0;
      setTest('news', {
        status: articleCount > 0 ? 'ok' : 'fail',
        result,
        error: articleCount > 0 ? null : 'LLM returned 0 articles. No NEWS_API_KEY is configured — using AI internet search as proxy.',
        dbCount: newsArticles.length,
        dbNote: `${recentNews.length} news articles in DB from last 30 days (${newsArticles.length} total). NOTE: News results are NOT auto-saved to DB — they are live-fetched. To cache them, save manually.`,
      });
    } catch (e) {
      setTest('news', { status: 'fail', error: String(e) });
    }

    // ── TEST 7: DB — UFC Organization ────────────────────────────────────────
    const ufcOrg = orgs.find(o => o.name === 'UFC' || o.short_name === 'UFC');
    setTest('db_ufc', {
      status: ufcOrg ? 'ok' : 'fail',
      result: ufcOrg || null,
      error: ufcOrg ? null : 'UFC organization not found in database. Go to Organizations page or Admin to add it.',
      dbCount: orgs.length,
      dbNote: `${orgs.length} organizations in DB total`,
    });

    setRunning(false);
  }

  const testDefs = [
    {
      key: 'tsdb_fighter',
      title: 'TheSportsDB — Islam Makhachev',
      endpoint: `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=Islam+Makhachev`,
    },
    {
      key: 'tsdb_events',
      title: 'TheSportsDB — UFC Upcoming Events',
      endpoint: `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4370`,
    },
    {
      key: 'wikidata',
      title: 'Wikidata SPARQL — Islam Makhachev',
      endpoint: `https://query.wikidata.org/sparql?query=...&format=json`,
    },
    {
      key: 'wikimedia',
      title: 'Wikimedia / Wikipedia — Islam Makhachev',
      endpoint: `https://en.wikipedia.org/api/rest_v1/page/summary/Islam_Makhachev`,
    },
    {
      key: 'youtube',
      title: 'YouTube (via LLM internet search)',
      endpoint: `InvokeLLM(add_context_from_internet=true) — No YOUTUBE_API_KEY configured`,
    },
    {
      key: 'news',
      title: 'News (via LLM internet search)',
      endpoint: `InvokeLLM(add_context_from_internet=true) — No NEWS_API_KEY configured`,
    },
    {
      key: 'db_ufc',
      title: 'DB — UFC Organization record',
      endpoint: `base44.entities.Organization.filter({ name: "UFC" })`,
    },
  ];

  const allDone = Object.keys(tests).length >= testDefs.length && !running;
  const passCount = Object.values(tests).filter(t => t.status === 'ok').length;
  const failCount = Object.values(tests).filter(t => t.status === 'fail').length;

  return (
    <div className="space-y-6 pb-24 md:pb-8 max-w-2xl mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Integration Tests</h1>
        <p className="text-sm text-muted-foreground mt-1">Live verification of all data sources. Shows real API responses.</p>
      </div>

      {/* DB Summary */}
      {Object.keys(dbCounts).length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[
            { label: 'Fighters', val: dbCounts.fighters },
            { label: 'Events', val: dbCounts.events },
            { label: 'News', val: dbCounts.news },
            { label: 'Videos', val: dbCounts.videos },
            { label: 'Orgs', val: dbCounts.orgs },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl border border-border/40 bg-card/40 p-3 text-center">
              <p className="text-xl font-bold font-heading">{val}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={runAllTests}
        disabled={running}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running tests...</> : '▶ Run All Live Tests'}
      </button>

      {allDone && (
        <div className={cn("rounded-xl p-4 border text-center font-bold",
          failCount === 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400')}>
          {passCount} passed · {failCount} failed
        </div>
      )}

      {/* Test results */}
      <div className="space-y-3">
        {testDefs.map(({ key, title, endpoint }) => (
          <TestCard
            key={key}
            title={title}
            endpoint={endpoint}
            status={tests[key]?.status || 'idle'}
            result={tests[key]?.result}
            error={tests[key]?.error}
            dbCount={tests[key]?.dbCount}
            dbNote={tests[key]?.dbNote}
            expanded={!!expanded[key]}
            onToggle={() => toggle(key)}
          />
        ))}
      </div>

      {/* API Key Status */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
        <p className="font-semibold text-sm">API Key Configuration Status</p>
        {[
          { name: 'THESPORTSDB_API_KEY', note: 'Using free key "3" — no secret needed. Paid key unlocks full endpoint access.' },
          { name: 'YOUTUBE_API_KEY', note: 'NOT configured. Currently proxied via LLM. Add key in Base44 → Secrets for real YouTube API.' },
          { name: 'NEWS_API_KEY', note: 'NOT configured. Currently proxied via LLM. Add key in Base44 → Secrets for real NewsAPI.' },
        ].map(({ name, note }) => (
          <div key={name} className="flex items-start gap-2">
            <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border mt-0.5 shrink-0',
              name === 'THESPORTSDB_API_KEY' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
              {name === 'THESPORTSDB_API_KEY' ? '✅' : '⚠️'}
            </span>
            <div>
              <p className="text-xs font-mono font-semibold">{name}</p>
              <p className="text-[11px] text-muted-foreground">{note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}