import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getFighterProfile, getRecentNews, getRecentVideos } from '@/lib/dataService';
import { ArrowLeft, Globe, Video, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import DisciplineBadge from '@/components/shared/DisciplineBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveFighterImage, fetchWikipediaPortrait } from '@/lib/fighterImage';
import { format } from 'date-fns';

function SourceLabel({ source }) {
  if (!source) return null;
  const colors = {
    wikipedia: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    wikimedia: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    thesportsdb: 'bg-green-500/10 text-green-400 border-green-500/20',
    database: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    web_search: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border uppercase tracking-wider', colors[source] || 'bg-muted text-muted-foreground border-border')}>
      {source}
    </span>
  );
}

function NoLiveData({ message = 'No live data available' }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-border/40 bg-card/20">
      <AlertCircle className="w-6 h-6 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function NewsCard({ article }) {
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-card/40 hover:border-primary/30 transition-all group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">{article.title}</p>
        {article.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {article.source_name && <span className="text-[10px] text-muted-foreground font-medium">{article.source_name}</span>}
          {article.published_at && (
            <span className="text-[10px] text-muted-foreground">
              · {format(new Date(article.published_at), 'MMM d, yyyy')}
            </span>
          )}
          <SourceLabel source={article.data_source} />
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
    </a>
  );
}

function VideoCard({ video }) {
  return (
    <a href={video.url} target="_blank" rel="noopener noreferrer"
      className="rounded-xl border border-border/40 bg-card/40 hover:border-primary/30 transition-all group overflow-hidden">
      <div className="relative aspect-video bg-muted">
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="w-full h-full object-cover"
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
            <Video className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors">{video.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-[10px] text-muted-foreground">{video.channel_name}</p>
          {video.published_at && <span className="text-[10px] text-muted-foreground">· {format(new Date(video.published_at), 'MMM d, yyyy')}</span>}
          <SourceLabel source={video.data_source} />
        </div>
      </div>
    </a>
  );
}

// Large portrait for the profile header — rectangular, face-biased crop
function FighterHeroImage({ fighter }) {
  const name = fighter?.name || '';
  const { url: staticUrl } = resolveFighterImage(fighter);
  const [imgUrl, setImgUrl] = useState(staticUrl);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
    const { url } = resolveFighterImage(fighter);
    if (url) {
      setImgUrl(url);
    } else if (name) {
      fetchWikipediaPortrait(name).then(wikiUrl => setImgUrl(wikiUrl));
    }
  }, [fighter?.preferred_profile_image_url, fighter?.image_url, name]);

  const displayUrl = imgError ? null : imgUrl;
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="w-28 h-36 md:w-36 md:h-44 shrink-0 rounded-xl overflow-hidden border-2 border-border/40 bg-muted">
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={name}
          className="w-full h-full object-cover object-top"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
          <span className="text-2xl font-bold text-muted-foreground font-heading">{initials}</span>
        </div>
      )}
    </div>
  );
}

export default function FighterProfile() {
  const { name } = useParams();
  const decodedName = decodeURIComponent(name);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['fighter-profile', decodedName],
    queryFn: () => getFighterProfile(decodedName),
    retry: 1,
  });

  const { data: news = [], isLoading: newsLoading, isFetched: newsFetched } = useQuery({
    queryKey: ['fighter-news', decodedName],
    queryFn: () => getRecentNews({ fighterName: decodedName }),
    enabled: activeTab === 'news',
    retry: 1,
  });

  const { data: videos = [], isLoading: videosLoading, isFetched: videosFetched } = useQuery({
    queryKey: ['fighter-videos', decodedName],
    queryFn: () => getRecentVideos({ fighterName: decodedName }),
    enabled: activeTab === 'videos',
    retry: 1,
  });

  const { data: fights = [] } = useQuery({
    queryKey: ['fighter-fights', decodedName],
    queryFn: () => base44.entities.Fight.list('order', 200).then(all =>
      all.filter(f => f.fighter_a_name === decodedName || f.fighter_b_name === decodedName)
    ),
  });

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'fights', label: `Fights (${fights.length})` },
    { id: 'news', label: 'News' },
    { id: 'videos', label: 'Videos' },
  ];

  if (profileLoading) return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );

  if (profileError || !profile) return (
    <div className="flex flex-col items-center py-24 gap-4">
      <p className="text-muted-foreground">Fighter not found: {decodedName}</p>
      <Link to="/fighters" className="text-primary text-sm hover:underline">← Back to fighters</Link>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 md:pb-8 max-w-2xl mx-auto">
      <Link to="/fighters" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Fighters
      </Link>

      {/* Profile Header */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-6 flex items-start gap-5">
        <FighterHeroImage fighter={profile} />
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-2xl md:text-3xl font-bold uppercase tracking-wide">{profile.name}</h1>
          {profile.nickname && <p className="text-sm text-muted-foreground italic mt-0.5">"{profile.nickname}"</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <DisciplineBadge discipline={profile.discipline} />
            {profile.weight_class && <span className="text-xs text-muted-foreground">{profile.weight_class}</span>}
            {profile.nationality && <span className="text-xs text-muted-foreground">· {profile.nationality}</span>}
          </div>
          {(profile.wins != null || profile.losses != null) && (
            <div className="flex items-center gap-4 mt-3">
              <div className="text-center">
                <p className="text-xl font-bold text-green-400">{profile.wins ?? '—'}</p>
                <p className="text-[10px] text-muted-foreground uppercase">W</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-400">{profile.losses ?? '—'}</p>
                <p className="text-[10px] text-muted-foreground uppercase">L</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-muted-foreground">{profile.draws ?? '—'}</p>
                <p className="text-[10px] text-muted-foreground uppercase">D</p>
              </div>
              {profile.ranking && (
                <div className="text-center">
                  <p className="text-xl font-bold text-amber-400">#{profile.ranking}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Rank</p>
                </div>
              )}
            </div>
          )}
          {/* Data source badges */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Sources:</span>
            {profile.sources?.database && <SourceLabel source="database" />}
            {profile.sources?.wikipedia && <SourceLabel source="wikipedia" />}
            {profile.sources?.thesportsdb && <SourceLabel source="thesportsdb" />}
            {!profile.sources?.database && !profile.sources?.wikipedia && !profile.sources?.thesportsdb && (
              <span className="text-[10px] text-muted-foreground">No verified data</span>
            )}
          </div>
        </div>
      </div>

      {/* External Links */}
      <div className="flex flex-wrap gap-2">
        {profile.wikipedia_url && (
          <a href={profile.wikipedia_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground transition-all">
            <Globe className="w-3.5 h-3.5" /> Wikipedia
          </a>
        )}
        {profile.tapology_url && (
          <a href={profile.tapology_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground transition-all">
            <ExternalLink className="w-3.5 h-3.5" /> Tapology
          </a>
        )}
        {profile.sherdog_url && (
          <a href={profile.sherdog_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground transition-all">
            <ExternalLink className="w-3.5 h-3.5" /> Sherdog
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all",
              activeTab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {profile.biography ? (
            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Biography</p>
                {profile.sources?.wikipedia && <SourceLabel source="wikipedia" />}
              </div>
              <p className="text-sm leading-relaxed text-foreground/80">{profile.biography}</p>
            </div>
          ) : (
            <NoLiveData message="Biography not available from any connected source." />
          )}
        </div>
      )}

      {/* Fights */}
      {activeTab === 'fights' && (
        <div className="space-y-2">
          {fights.length === 0 ? (
            <NoLiveData message="No fight records in database for this fighter." />
          ) : fights.map(fight => {
            const isA = fight.fighter_a_name === decodedName;
            const opponent = isA ? fight.fighter_b_name : fight.fighter_a_name;
            const won = fight.winner_name === decodedName;
            const lost = fight.winner_name && fight.winner_name !== decodedName;
            return (
              <Link key={fight.id} to={`/fights/${fight.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/40 hover:border-primary/30 transition-all">
                <span className={cn('text-xs font-bold uppercase w-6 text-center',
                  won && 'text-green-400', lost && 'text-red-400', !fight.winner_name && 'text-muted-foreground')}>
                  {won ? 'W' : lost ? 'L' : fight.status === 'scheduled' ? 'vs' : '—'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{opponent}</p>
                  {fight.method && <p className="text-xs text-muted-foreground">{fight.method} · R{fight.finish_round}</p>}
                </div>
                <DisciplineBadge discipline={fight.discipline} />
              </Link>
            );
          })}
        </div>
      )}

      {/* News */}
      {activeTab === 'news' && (
        <div className="space-y-3">
          {newsLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : news.length > 0 ? (
            news.map((a, i) => <NewsCard key={i} article={a} />)
          ) : newsFetched ? (
            <NoLiveData message="No live data available. News search returned no results." />
          ) : null}
        </div>
      )}

      {/* Videos */}
      {activeTab === 'videos' && (
        <div className="grid grid-cols-2 gap-3">
          {videosLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)
          ) : videos.length > 0 ? (
            videos.map((v, i) => <VideoCard key={i} video={v} />)
          ) : videosFetched ? (
            <div className="col-span-2">
              <NoLiveData message="No live data available. Video search returned no results." />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}