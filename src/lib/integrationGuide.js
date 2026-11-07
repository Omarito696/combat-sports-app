/**
 * INTEGRATION GUIDE — Placeholder Endpoints
 * 
 * This file documents every official source that needs a backend endpoint,
 * API key, or scraper. Use this as your build plan.
 * 
 * STATUS KEY:
 *   ✅ Free API exists       — can call directly
 *   🔑 API key required      — add key to Base44 secrets
 *   🕷️  Scraper needed        — needs backend function
 *   📋 Manual import only    — download CSV/JSON from official site
 */

export const INTEGRATION_GUIDE = [

  // ── MMA ─────────────────────────────────────────────────────────────────────
  {
    endpoint: '/official/ufc/events',
    org: 'UFC',
    discipline: 'MMA',
    officialUrl: 'https://www.ufc.com/events',
    apiAvailable: false,
    scrapingNeeded: true,
    apiKey: null,
    fields: ['event_name','date','venue','location','fight_card','status'],
    notes: 'No public API. Scrape ufc.com/events. Use Puppeteer/Playwright in a backend function. Alternatively use TheSportsDB league ID 4370.',
    status: 'scraper',
    thesportsdb_league_id: '4370',
  },
  {
    endpoint: '/official/one/events',
    org: 'ONE Championship',
    discipline: 'MMA',
    officialUrl: 'https://www.onefc.com/events/',
    apiAvailable: false,
    scrapingNeeded: true,
    apiKey: null,
    fields: ['event_name','date','venue','location','fight_card'],
    notes: 'No public API. Scrape onefc.com. TheSportsDB league ID 4940 has some data.',
    status: 'scraper',
    thesportsdb_league_id: '4940',
  },
  {
    endpoint: '/official/pfl/events',
    org: 'PFL',
    discipline: 'MMA',
    officialUrl: 'https://pflmma.com/events',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','venue','location','fight_card'],
    notes: 'No public API. Scrape pflmma.com/events.',
    status: 'scraper',
  },
  {
    endpoint: '/official/bellator/events',
    org: 'Bellator',
    discipline: 'MMA',
    officialUrl: 'https://www.bellator.com/events',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','venue','location','fight_card'],
    notes: 'Now under PFL banner. TheSportsDB league ID 4405.',
    status: 'scraper',
    thesportsdb_league_id: '4405',
  },

  // ── Boxing Rankings ──────────────────────────────────────────────────────────
  {
    endpoint: '/official/wbc/rankings',
    org: 'WBC',
    discipline: 'Boxing',
    officialUrl: 'https://www.wbcboxing.com/en/rankings/',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['weight_class','rank','fighter_name','nationality','record'],
    notes: 'HTML table scraping needed. No API.',
    status: 'scraper',
  },
  {
    endpoint: '/official/wba/rankings',
    org: 'WBA',
    discipline: 'Boxing',
    officialUrl: 'https://www.wbaboxing.com/wba-ratings',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['weight_class','rank','fighter_name','nationality'],
    notes: 'HTML table scraping needed.',
    status: 'scraper',
  },
  {
    endpoint: '/official/ibf/rankings',
    org: 'IBF',
    discipline: 'Boxing',
    officialUrl: 'https://www.ibf-usba-boxing.com/ratings',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['weight_class','rank','fighter_name','nationality'],
    notes: 'HTML table scraping needed.',
    status: 'scraper',
  },
  {
    endpoint: '/official/wbo/rankings',
    org: 'WBO',
    discipline: 'Boxing',
    officialUrl: 'https://www.wboboxing.com/wbo-ratings/',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['weight_class','rank','fighter_name','nationality'],
    notes: 'HTML table scraping needed.',
    status: 'scraper',
  },

  // ── BJJ / Grappling ──────────────────────────────────────────────────────────
  {
    endpoint: '/official/ibjjf/events',
    org: 'IBJJF',
    discipline: 'BJJ',
    officialUrl: 'https://ibjjf.com/events/calendar',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','location','gi_nogi','registration_status'],
    notes: 'No public API. Scrape ibjjf.com/events/calendar. Alternatively use their iCal feed if available.',
    status: 'scraper',
  },
  {
    endpoint: '/official/adcc/events',
    org: 'ADCC',
    discipline: 'Submission Grappling',
    officialUrl: 'https://adcombat.com/adcc-events/',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','location','weight_classes'],
    notes: 'No public API. Limited event count — manual entry feasible.',
    status: 'manual_or_scraper',
  },
  {
    endpoint: '/official/flograppling/events',
    org: 'FloGrappling / WNO',
    discipline: 'Submission Grappling',
    officialUrl: 'https://www.flograppling.com/events',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','fighters','format'],
    notes: 'FloSports requires a paid subscription. Scraping may violate ToS. Manual entry recommended.',
    status: 'manual',
  },

  // ── Kickboxing / Muay Thai ───────────────────────────────────────────────────
  {
    endpoint: '/official/glory/events',
    org: 'Glory Kickboxing',
    discipline: 'Kickboxing',
    officialUrl: 'https://www.glorykickboxing.com/events',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','venue','location','fight_card'],
    notes: 'No public API. Scrape glorykickboxing.com.',
    status: 'scraper',
  },
  {
    endpoint: '/official/k1/events',
    org: 'K-1',
    discipline: 'Kickboxing',
    officialUrl: 'https://k-1.com/en/schedule/',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','venue','location'],
    notes: 'Scrape k-1.com/en/schedule.',
    status: 'scraper',
  },

  // ── Wrestling ────────────────────────────────────────────────────────────────
  {
    endpoint: '/official/uww/events',
    org: 'United World Wrestling',
    discipline: 'Wrestling',
    officialUrl: 'https://uww.org/events',
    apiAvailable: true,
    apiKey: null,
    fields: ['event_name','date','location','discipline','weight_class'],
    notes: 'UWW has a partial API and JSON feeds at https://uww.org/api. Check https://uww.org/competition for public JSON endpoints.',
    status: 'api',
    apiDocsUrl: 'https://uww.org/api',
  },

  // ── Judo ─────────────────────────────────────────────────────────────────────
  {
    endpoint: '/official/ijf/events',
    org: 'International Judo Federation',
    discipline: 'Judo',
    officialUrl: 'https://www.ijf.org/tournaments',
    apiAvailable: true,
    apiKey: null,
    fields: ['event_name','date','location','category','weight_class'],
    notes: 'IJF has a public JSON API at https://data.ijf.org. Endpoints: /api/event?year=2025. No key needed for public data.',
    status: 'api',
    apiDocsUrl: 'https://data.ijf.org',
    exampleCall: 'GET https://data.ijf.org/api/event?year=2025&limit=50',
  },

  // ── Karate ───────────────────────────────────────────────────────────────────
  {
    endpoint: '/official/wkf/events',
    org: 'World Karate Federation',
    discipline: 'Karate',
    officialUrl: 'https://www.wkf.net/calendar/',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','location','category'],
    notes: 'No public API. Scrape wkf.net/calendar.',
    status: 'scraper',
  },

  // ── Taekwondo ────────────────────────────────────────────────────────────────
  {
    endpoint: '/official/world-taekwondo/events',
    org: 'World Taekwondo',
    discipline: 'Taekwondo',
    officialUrl: 'https://www.worldtaekwondo.org/competition/competition-schedule.html',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','location','category','weight_class'],
    notes: 'No public API. Scrape worldtaekwondo.org.',
    status: 'scraper',
  },

  // ── Wushu ────────────────────────────────────────────────────────────────────
  {
    endpoint: '/official/iwuf/events',
    org: 'IWUF',
    discipline: 'Kung Fu / Wushu',
    officialUrl: 'https://www.iwuf.org/competitions/',
    apiAvailable: false,
    scrapingNeeded: true,
    fields: ['event_name','date','location','category'],
    notes: 'No public API. Scrape iwuf.org.',
    status: 'scraper',
  },

  // ── Cross-Sport Data Sources ──────────────────────────────────────────────────
  {
    endpoint: '/api/thesportsdb',
    name: 'TheSportsDB',
    officialUrl: 'https://www.thesportsdb.com/api.php',
    apiAvailable: true,
    apiKey: 'THESPORTSDB_API_KEY',
    secretName: 'THESPORTSDB_API_KEY',
    freeKey: '3',
    fields: ['fighter_name','image','nationality','description','events','leagues'],
    notes: 'Free tier uses key "3". Get a paid key at patreon.com/thesportsdb for full access including events. Add as secret THESPORTSDB_API_KEY.',
    status: 'api_key_optional',
    disciplines: ['MMA','Boxing','Wrestling','Judo'],
  },
  {
    endpoint: '/api/youtube',
    name: 'YouTube Data API v3',
    officialUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    apiAvailable: true,
    apiKey: 'YOUTUBE_API_KEY',
    secretName: 'YOUTUBE_API_KEY',
    freeQuota: '10,000 units/day',
    fields: ['video_title','channel','published_at','thumbnail','video_id','duration'],
    notes: 'Go to https://console.cloud.google.com → Enable YouTube Data API v3 → Create credentials (API Key) → Add as secret YOUTUBE_API_KEY.',
    status: 'api_key_required',
    disciplines: ['all'],
  },
  {
    endpoint: '/api/newsapi',
    name: 'NewsAPI',
    officialUrl: 'https://newsapi.org',
    apiAvailable: true,
    apiKey: 'NEWS_API_KEY',
    secretName: 'NEWS_API_KEY',
    freeQuota: '100 requests/day — headlines only on free tier',
    fields: ['title','source','published_at','url','urlToImage','description'],
    notes: 'Register at newsapi.org. Free tier only works server-side. Add key as secret NEWS_API_KEY. For more, consider Bing News Search API (Azure, $7/1000 calls) or Google Custom Search.',
    status: 'api_key_required',
    disciplines: ['all'],
  },
  {
    endpoint: '/api/wikidata',
    name: 'Wikidata / Wikimedia Commons',
    officialUrl: 'https://www.wikidata.org',
    apiAvailable: true,
    apiKey: null,
    freeQuota: 'Free, no key',
    fields: ['wikidata_id','name','nationality','dob','image_commons_url','wikipedia_url'],
    notes: 'Free SPARQL endpoint at https://query.wikidata.org/sparql. Images via Wikimedia Commons. No key needed. Rate limit: ~100 req/min.',
    status: 'free',
    disciplines: ['all'],
  },
];

/**
 * Get integration info for a specific organization
 */
export function getIntegrationByOrg(orgName) {
  return INTEGRATION_GUIDE.find(g => g.org === orgName || g.name === orgName);
}

/**
 * Get all integrations requiring API keys
 */
export function getRequiredApiKeys() {
  return INTEGRATION_GUIDE
    .filter(g => g.apiKey && g.status === 'api_key_required')
    .map(g => ({ secretName: g.apiKey, service: g.name || g.org, url: g.officialUrl, notes: g.notes }));
}

/**
 * Get all scraper placeholders
 */
export function getScraperPlaceholders() {
  return INTEGRATION_GUIDE.filter(g => g.scrapingNeeded || g.status === 'scraper');
}