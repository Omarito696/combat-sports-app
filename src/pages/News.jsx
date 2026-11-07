import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Newspaper, Loader2, ExternalLink, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import DisciplineFilter from '@/components/shared/DisciplineFilter';

function NewsCard({ article }) {
  return (
    <a
      href={article.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-xl border border-border/60 bg-card/50 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col"
    >
      {article.image_url && (
        <div className="aspect-video overflow-hidden bg-muted">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col gap-2">
        {article.discipline && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{article.discipline}</span>
        )}
        <h3 className="font-heading text-base font-bold uppercase tracking-wide leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">{article.summary}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground">{article.source || 'MMA News'}</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </a>
  );
}

export default function News() {
  const [discipline, setDiscipline] = useState(null);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(false);

  const { data: newsItems = [], refetch } = useQuery({
    queryKey: ['news', discipline],
    queryFn: async () => {
      setFetching(true);
      try {
        const topic = discipline ? `${discipline} combat sports` : 'MMA boxing BJJ Muay Thai kickboxing martial arts';
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Search the web for the latest news articles, fight announcements, fighter interviews, and video highlights about ${topic}. Return 12 recent items with real URLs if possible.`,
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
                    summary: { type: 'string' },
                    url: { type: 'string' },
                    source: { type: 'string' },
                    discipline: { type: 'string' },
                    image_url: { type: 'string' },
                    type: { type: 'string', description: 'article, video, or clip' },
                  },
                },
              },
            },
          },
        });
        return result.articles || [];
      } finally {
        setFetching(false);
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const filtered = newsItems.filter(a =>
    !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.summary?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide flex items-center gap-2">
            <Newspaper className="w-7 h-7 text-primary" /> News
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Latest combat sports news, articles & highlights</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={fetching}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Newspaper className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search news..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-card/50 border-border/60"
        />
      </div>

      <DisciplineFilter selected={discipline} onSelect={setDiscipline} />

      {fetching && newsItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Fetching latest combat sports news...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((article, i) => (
            <NewsCard key={i} article={article} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Newspaper className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Click Refresh to load the latest news</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Load News
          </button>
        </div>
      )}
    </div>
  );
}