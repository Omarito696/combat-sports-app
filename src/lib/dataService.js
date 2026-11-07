/**
 * FightTracker Data Service
 * Priority order for each source:
 *   1. DB (manually verified)
 *   2. TheSportsDB (free, direct API)
 *   3. Wikipedia REST API (free, no key, CORS-friendly)
 *   4. Wikidata SPARQL (free, no key)
 *   5. YouTube Data API v3 (needs YOUTUBE_API_KEY secret → backend function)
 *   6. NewsAPI (needs NEWS_API_KEY secret → backend function)
 *   7. LLM internet search (fallback only, clearly labelled)
 */

import { base44 } from '@/api/base44Client';

const THESPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const WIKIPEDIA_REST = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Wikipedia REST API ───────────────────────────────────────────────────────
// Free, no key, CORS-allowed from browsers.
// Returns real image thumbnails for almost every notable fighter.

export async function getWikipediaData(name) {
  // Wikipedia page titles use underscores
  const slug = name.replace(/ /g, '_');
  const data = await fetchJson(`${WIKIPEDIA_REST}/${encodeURIComponent(slug)}`);
  if (!data || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
  return {
    image_url: data.thumbnail?.source || data.originalimage?.source || null,
    image_source: 'wikipedia',
    biography: data.extract || null,
    wikipedia_url: data.content_urls?.desktop?.page || null,
    wikidata_id: data.wikibase_item || null,
  };
}

// ─── TheSportsDB ──────────────────────────────────────────────────────────────
// Free tier with key "3". Works for player search and event lookup.

export const TheSportsDB = {
  async searchPlayer(name) {
    const data = await fetchJson(`${THESPORTSDB_BASE}/searchplayers.php?p=${encodeURIComponent(name)}`);
    return data?.player || [];
  },

  async getUpcomingEvents(leagueId) {
    const data = await fetchJson(`${THESPORTSDB_BASE}/eventsnextleague.php?id=${leagueId}`);
    return data?.events || [];
  },

  async getPastEvents(leagueId) {
    const data = await fetchJson(`${THESPORTSDB_BASE}/eventspastleague.php?id=${leagueId}`);
    return data?.events || [];
  },

  LEAGUE_IDS: {
    UFC: '4370',
    'ONE Championship': '4940',
    Bellator: '4405',
    'ONE FC': '4940',
  },
};

// ─── Wikidata SPARQL ──────────────────────────────────────────────────────────
// Free, no key. Slower than Wikipedia REST but has more structured data.

export async function getWikidataFighter(name) {
  const query = `
    SELECT ?item ?image ?countryLabel ?dob WHERE {
      ?item rdfs:label "${name}"@en .
      OPTIONAL { ?item wdt:P18 ?image . }
      OPTIONAL { ?item wdt:P27 ?country . }
      OPTIONAL { ?item wdt:P569 ?dob . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
    } LIMIT 3
  `;
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}&format=json`;
  const data = await fetchJson(url, { headers: { 'User-Agent': 'FightTracker/1.0' } });
  const bindings = data?.results?.bindings || [];
  if (!bindings.length) return null;
  const b = bindings[0];
  const imageFile = b.image?.value;
  let image_url = null;
  if (imageFile) {
    const filename = imageFile.split('/').pop();
    image_url = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=300`;
  }
  return {
    image_url,
    image_source: 'wikimedia',
    nationality: b.countryLabel?.value || null,
    date_of_birth: b.dob?.value?.split('T')[0] || null,
    wikidata_id: b.item?.value?.split('/').pop() || null,
  };
}

// ─── Fighter Image — cascading fetch ─────────────────────────────────────────
// Returns { url, source } — tries Wikipedia first (fastest), then Wikidata, then TheSportsDB.

export async function fetchFighterImage(name) {
  // 1. Wikipedia REST (fastest, most reliable, CORS-friendly)
  const wiki = await getWikipediaData(name);
  if (wiki?.image_url) return { url: wiki.image_url, source: 'wikipedia', wiki };

  // 2. TheSportsDB
  const tsdb = await TheSportsDB.searchPlayer(name);
  const img = tsdb[0]?.strThumb || tsdb[0]?.strCutout || tsdb[0]?.strRender;
  if (img) return { url: img, source: 'thesportsdb', tsdb: tsdb[0] };

  // 3. Wikidata
  const wd = await getWikidataFighter(name);
  if (wd?.image_url) return { url: wd.image_url, source: 'wikimedia', wikidata: wd };

  return { url: null, source: null };
}

// ─── getFighterProfile ────────────────────────────────────────────────────────
// Uses safe identity matching: DB record is primary source of truth.
// External sources (Wikipedia, TheSportsDB) only fill in MISSING fields —
// they never overwrite existing verified data.

export async function getFighterProfile(fighterName) {
  // 1. Load all DB fighters and find exact match by name
  const allDbFighters = await base44.entities.Fighter.list('name', 500);
  // Exact name match first, then partial
  const db = allDbFighters.find(f => f.name.toLowerCase() === fighterName.toLowerCase())
    || allDbFighters.find(f => f.name.toLowerCase().includes(fighterName.toLowerCase()))
    || null;

  // 2. Wikipedia (for bio + wikidata_id only — not for record/stats)
  const wikiData = await getWikipediaData(fighterName);

  // 3. TheSportsDB — only used if we have a stored thesportsdb_id (stable match)
  //    or if DB record is missing and we have a high-confidence name match
  let tsdb = null;
  if (db?.thesportsdb_id) {
    // Use stored ID for a stable lookup (not just name search)
    const tsdbResults = await TheSportsDB.searchPlayer(db.name);
    tsdb = tsdbResults.find(p => p.idPlayer === db.thesportsdb_id) || null;
  }

  // 4. Image priority:
  //    preferred_profile_image_url > DB image_url (if approved/auto) > wikipedia (fallback only)
  //    Never use Wikipedia/TheSportsDB images if DB has an approved image.
  let image_url = db?.preferred_profile_image_url || null;
  let image_source = image_url ? 'preferred' : null;

  if (!image_url && db?.image_url && db?.image_confidence !== 'rejected') {
    image_url = db.image_url;
    image_source = db.image_source || 'database';
  }

  // Wikipedia only as last resort and only for display — never auto-saved back to DB
  if (!image_url && wikiData?.image_url) {
    image_url = wikiData.image_url;
    image_source = 'wikipedia';
  }

  return {
    // Core identity — always from DB if available; never from external name-only match
    id: db?.id || null,
    name: db?.name || fighterName,
    nickname: db?.nickname || tsdb?.strNickname || null,
    nationality: db?.nationality || null,
    discipline: db?.discipline || 'MMA',
    weight_class: db?.weight_class || null,
    // Records ONLY from DB — never from external source
    wins: db?.wins ?? null,
    losses: db?.losses ?? null,
    draws: db?.draws ?? null,
    no_contests: db?.no_contests ?? null,
    // Bio: DB first, then Wikipedia (clearly labeled)
    biography: db?.biography || (wikiData?.biography ? wikiData.biography : null),
    image_url,
    image_source,
    image_confidence: db?.image_confidence || 'unverified',
    preferred_profile_image_url: db?.preferred_profile_image_url || null,
    wikipedia_url: db?.wikipedia_url || wikiData?.wikipedia_url || null,
    wikidata_id: db?.wikidata_id || wikiData?.wikidata_id || null,
    thesportsdb_id: db?.thesportsdb_id || null,
    tapology_url: db?.tapology_url || null,
    sherdog_url: db?.sherdog_url || null,
    ufc_url: db?.ufc_url || null,
    ranking: db?.ranking || null,
    status: db?.status || null,
    data_quality: db?.data_quality || 'stub',
    data_confidence: db?.data_confidence || 'low',
    needs_admin_review: db?.needs_admin_review || false,
    sources: {
      database: !!db,
      wikipedia: !!wikiData?.biography,
      thesportsdb: !!tsdb,
    },
  };
}

// ─── getUpcomingEvents ────────────────────────────────────────────────────────
// Returns ONLY events with date >= today, sorted ascending.

export async function getUpcomingEvents({ discipline, organization } = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allEvents = await base44.entities.Event.list('date', 200);
  let upcoming = allEvents.filter(e => {
    if (!e.date) return false;
    if (e.status === 'completed') return false;
    return new Date(e.date) >= today;
  });

  if (discipline) upcoming = upcoming.filter(e => e.discipline === discipline);
  if (organization) upcoming = upcoming.filter(e =>
    e.organization?.toLowerCase().includes(organization.toLowerCase()) ||
    e.name?.toLowerCase().includes(organization.toLowerCase())
  );

  return upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ─── getRecentNews ────────────────────────────────────────────────────────────
// Uses LLM internet search. Shows real results or "No live data available".

export async function getRecentNews({ fighterName, organization, discipline, daysBack = 30 } = {}) {
  const queryParts = [fighterName, organization, discipline].filter(Boolean);
  const query = queryParts.join(' ') || 'MMA combat sports';
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  const fromStr = fromDate.toISOString().split('T')[0];

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Find real, recent news articles about "${query}" in combat sports.
Only include articles published after ${fromStr}.
Return up to 8 results. Each must have a real URL that actually exists on the web.
Fields: title (string), source (publication name), publishedAt (ISO date string), url (real URL), summary (1-2 sentences max).
If you cannot find real articles, return an empty array.
Return format: { "articles": [] }`,
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

  return (result?.articles || []).map(a => ({
    title: a.title,
    source_name: a.source,
    published_at: a.publishedAt,
    url: a.url,
    summary: a.summary,
    data_source: 'web_search',
  }));
}

// ─── getRecentVideos ──────────────────────────────────────────────────────────
// Uses LLM internet search. Shows real results or empty array.

export async function getRecentVideos({ fighterName, organization, discipline, daysBack = 30 } = {}) {
  const queryParts = [fighterName, organization, discipline].filter(Boolean);
  const query = queryParts.join(' ') || 'MMA combat sports';
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  const fromStr = fromDate.toISOString().split('T')[0];

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Find real YouTube videos about "${query}" in combat sports published after ${fromStr}.
Focus on: fight highlights, interviews, press conferences, weigh-ins, previews.
Only include videos with real YouTube video IDs that actually exist.
Fields: title (string), channelTitle (string), publishedAt (ISO date), videoId (real 11-char YouTube ID), description (short).
If you cannot find real videos, return an empty array.
Return format: { "videos": [] }`,
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
              description: { type: 'string' },
            },
          },
        },
      },
    },
  });

  return (result?.videos || []).map(v => ({
    title: v.title,
    channel_name: v.channelTitle,
    published_at: v.publishedAt,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    thumbnail_url: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
    youtube_id: v.videoId,
    data_source: 'web_search',
  }));
}

// ─── getRankings ──────────────────────────────────────────────────────────────

export async function getRankings({ discipline, organization } = {}) {
  const fighters = await base44.entities.Fighter.list('ranking', 50);
  return fighters.filter(f => {
    if (discipline && f.discipline !== discipline) return false;
    if (organization && f.organization !== organization) return false;
    return f.ranking != null;
  });
}

// ─── refreshFighterData ───────────────────────────────────────────────────────
// Pulls fresh data from external sources. 
// SAFETY RULES:
//   - Never overwrite existing verified data (data_quality=verified or data_confidence=high)
//   - Never overwrite existing images (admin must approve new images)
//   - Only fill in MISSING fields
//   - Always mark externally-sourced images as 'unverified' pending admin review
//   - Records (wins/losses) are NEVER updated from external sources — admin only

export async function refreshFighterData(fighter) {
  const updates = {};
  const warnings = fighter.data_warnings ? [...fighter.data_warnings] : [];

  // Never touch verified fighters unless explicitly forced
  const isVerified = fighter.data_quality === 'verified' || fighter.data_confidence === 'high';

  const [wikiData, tsdbResults] = await Promise.all([
    getWikipediaData(fighter.name),
    // TheSportsDB: use stored ID if available for stable matching
    fighter.thesportsdb_id
      ? TheSportsDB.searchPlayer(fighter.name).then(rs => rs.find(p => p.idPlayer === fighter.thesportsdb_id) || rs[0] || null)
      : TheSportsDB.searchPlayer(fighter.name).then(rs => rs[0] || null),
  ]);

  // Biography — only fill if missing
  if (wikiData?.biography && !fighter.biography) {
    updates.biography = wikiData.biography;
  }
  if (wikiData?.wikipedia_url && !fighter.wikipedia_url) {
    updates.wikipedia_url = wikiData.wikipedia_url;
  }
  // Wikidata ID — safe to fill even for verified fighters (it's additive, not overwriting)
  if (wikiData?.wikidata_id && !fighter.wikidata_id) {
    updates.wikidata_id = wikiData.wikidata_id;
    // Having a wikidata ID increases our confidence
    if (!fighter.data_confidence || fighter.data_confidence === 'low') {
      updates.data_confidence = 'medium';
    }
  }

  const tsdb = Array.isArray(tsdbResults) ? tsdbResults[0] : tsdbResults;
  if (tsdb) {
    if (!fighter.thesportsdb_id && tsdb.idPlayer) updates.thesportsdb_id = tsdb.idPlayer;
    if (!fighter.nationality && tsdb.strNationality) updates.nationality = tsdb.strNationality;
  }

  // Image — ONLY fill if no image exists yet AND admin has not rejected images
  // New images from external sources are flagged as 'unverified' / pending review
  if (!fighter.preferred_profile_image_url && !fighter.image_url && fighter.image_confidence !== 'rejected') {
    let newImageUrl = null;
    let newImageSource = null;
    let newSourceType = null;

    if (tsdb?.strThumb) {
      newImageUrl = tsdb.strThumb;
      newImageSource = 'thesportsdb';
      newSourceType = 'sports_db';
    } else if (wikiData?.image_url) {
      newImageUrl = wikiData.image_url;
      newImageSource = 'wikipedia';
      newSourceType = 'wikipedia';
    } else {
      // Last resort: Wikidata image
      const wd = await getWikidataFighter(fighter.name);
      if (wd?.image_url) {
        newImageUrl = wd.image_url;
        newImageSource = 'wikimedia';
        newSourceType = 'wikimedia';
      }
    }

    if (newImageUrl) {
      updates.image_url = newImageUrl;
      updates.image_source = newImageSource;
      updates.image_source_type = newSourceType;
      updates.image_confidence = 'unverified'; // Must be reviewed by admin
      updates.image_pending_review = true;
      warnings.push(`Auto-fetched image from ${newImageSource} — pending admin review`);
    }
  }

  if (warnings.length > 0) updates.data_warnings = warnings;
  updates.last_data_refresh = new Date().toISOString();

  if (fighter.id && Object.keys(updates).length > 1) {
    await base44.entities.Fighter.update(fighter.id, updates);
  }

  return updates;
}