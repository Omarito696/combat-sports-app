/**
 * FightTracker Data Acquisition Source Hierarchy
 * 
 * Defines the OFFICIAL source priority for every organization and discipline.
 * 
 * Principle: Official organization sources FIRST. Secondary databases for cross-reference ONLY.
 * Never invent data. If a source is unavailable, say so explicitly.
 * 
 * METHOD LEGEND:
 *   api       - Direct API call (needs key or free endpoint)
 *   scrape    - Web page scraping (needs backend function or scraper)
 *   manual    - Manual data entry by admin
 *   fallback  - Fallback source when primary unavailable
 *   llm_search - LLM internet search (least reliable, clearly labeled)
 * 
 * STATUS LEGEND:
 *   available    - Currently usable (free API, no scraper needed)
 *   needs_key    - Needs API key in secrets (backend function required)
 *   needs_scraper - Needs a scraper backend function
 *   unavailable  - No known access method
 */

// ─── MMA ──────────────────────────────────────────────────────────────────────

export const MMA_SOURCES = {
  UFC: {
    athletes: { url: 'https://www.ufc.com/athletes', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://www.ufc.com/events', method: 'scrape', status: 'needs_scraper' },
    rankings: { url: 'https://www.ufc.com/rankings', method: 'scrape', status: 'needs_scraper' },
  },
  'ONE Championship': {
    athletes: { url: 'https://www.onefc.com/athletes/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://www.onefc.com/events/', method: 'scrape', status: 'needs_scraper' },
  },
  PFL: {
    athletes: { url: 'https://pflmma.com/fighters', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://pflmma.com/events', method: 'scrape', status: 'needs_scraper' },
  },
  Bellator: {
    athletes: { url: 'https://www.bellator.com/fighters', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://www.bellator.com/events', method: 'scrape', status: 'needs_scraper' },
  },
  Rizin: {
    athletes: { url: 'https://jp.rizinff.com/fighters', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://jp.rizinff.com/schedule', method: 'scrape', status: 'needs_scraper' },
  },
  KSW: {
    athletes: { url: 'https://kswmma.com/fighters/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://kswmma.com/events/', method: 'scrape', status: 'needs_scraper' },
  },
  'Cage Warriors': {
    athletes: { url: 'https://cagewarriors.com/fighters/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://cagewarriors.com/events/', method: 'scrape', status: 'needs_scraper' },
  },
  // Secondary verification only
  Sherdog: {
    fighters: { url: 'https://www.sherdog.com/fighter/', method: 'scrape', status: 'needs_scraper', note: 'Cross-reference only' },
    events: { url: 'https://www.sherdog.com/events/', method: 'scrape', status: 'needs_scraper', note: 'Cross-reference only' },
  },
  Tapology: {
    fighters: { url: 'https://www.tapology.com/fightcenter/fighters/', method: 'scrape', status: 'needs_scraper', note: 'Cross-reference only' },
    events: { url: 'https://www.tapology.com/fightcenter/events/', method: 'scrape', status: 'needs_scraper', note: 'Cross-reference only' },
  },
  // Free API (basic data only — use as supplement, never primary)
  TheSportsDB: {
    players: { url: 'https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=', method: 'api', status: 'available', note: 'Supplement only — no records/stats' },
    events: { url: 'https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=', method: 'api', status: 'available', note: 'Supplement only — verify dates' },
  },
};

// ─── BOXING ────────────────────────────────────────────────────────────────────

export const BOXING_SOURCES = {
  WBC: {
    rankings: { url: 'https://wbcboxing.com/en/rankings/', method: 'scrape', status: 'needs_scraper' },
    champions: { url: 'https://wbcboxing.com/en/champions/', method: 'scrape', status: 'needs_scraper' },
  },
  WBA: {
    rankings: { url: 'https://www.wbaboxing.com/wba-ranking', method: 'scrape', status: 'needs_scraper' },
  },
  IBF: {
    rankings: { url: 'https://www.ibf-usba-boxing.com/rankings/', method: 'scrape', status: 'needs_scraper' },
  },
  WBO: {
    rankings: { url: 'https://www.wboboxing.com/rankings/', method: 'scrape', status: 'needs_scraper' },
  },
  Matchroom: {
    events: { url: 'https://www.matchroomboxing.com/fight-schedule/', method: 'scrape', status: 'needs_scraper' },
    fighters: { url: 'https://www.matchroomboxing.com/fighters/', method: 'scrape', status: 'needs_scraper' },
  },
  'Top Rank': {
    events: { url: 'https://www.toprank.com/schedule/', method: 'scrape', status: 'needs_scraper' },
    fighters: { url: 'https://www.toprank.com/fighters/', method: 'scrape', status: 'needs_scraper' },
  },
  Queensberry: {
    events: { url: 'https://www.queensberry-promotions.co.uk/events/', method: 'scrape', status: 'needs_scraper' },
  },
  'Golden Boy': {
    events: { url: 'https://www.goldenboypromotions.com/en/fights/', method: 'scrape', status: 'needs_scraper' },
  },
  PBC: {
    events: { url: 'https://www.premierboxingchampions.com/schedule', method: 'scrape', status: 'needs_scraper' },
  },
  BoxRec: {
    fighters: { url: 'https://boxrec.com/en/boxer/', method: 'scrape', status: 'needs_scraper', note: 'Cross-reference only' },
    events: { url: 'https://boxrec.com/en/event/', method: 'scrape', status: 'needs_scraper', note: 'Cross-reference only' },
  },
};

// ─── KICKBOXING / MUAY THAI ────────────────────────────────────────────────────

export const KICKBOXING_SOURCES = {
  GLORY: {
    fighters: { url: 'https://www.glorykickboxing.com/fighters', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://www.glorykickboxing.com/events', method: 'scrape', status: 'needs_scraper' },
  },
  'ONE Championship': {
    striking: { url: 'https://www.onefc.com/athletes/', method: 'scrape', status: 'needs_scraper', note: 'Striking divisions only' },
  },
  'K-1': {
    fighters: { url: 'https://www.k-1.co.jp/fighter/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://www.k-1.co.jp/schedule/', method: 'scrape', status: 'needs_scraper' },
  },
  RISE: {
    fighters: { url: 'https://rise-rc.com/fighter/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://rise-rc.com/schedule/', method: 'scrape', status: 'needs_scraper' },
  },
  RWS: {
    events: { url: 'https://rajadamnern.com/', method: 'scrape', status: 'needs_scraper' },
  },
  Rajadamnern: {
    events: { url: 'https://rajadamnern.com/', method: 'scrape', status: 'needs_scraper' },
  },
  Lumpinee: {
    events: { url: 'https://www.lumpinee.com/', method: 'scrape', status: 'needs_scraper' },
  },
};

// ─── GRAPPLING ─────────────────────────────────────────────────────────────────

export const GRAPPLING_SOURCES = {
  ADCC: {
    athletes: { url: 'https://adcombat.com/athletes/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://adcombat.com/events/', method: 'scrape', status: 'needs_scraper' },
    results: { url: 'https://adcombat.com/results/', method: 'scrape', status: 'needs_scraper' },
  },
  IBJJF: {
    rankings: { url: 'https://ibjjf.com/rankings/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://ibjjf.com/events/', method: 'scrape', status: 'needs_scraper' },
    results: { url: 'https://ibjjf.com/results/', method: 'scrape', status: 'needs_scraper' },
  },
  AJP: {
    rankings: { url: 'https://ajptour.com/en/rankings/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://ajptour.com/en/events/', method: 'scrape', status: 'needs_scraper' },
  },
  Polaris: {
    events: { url: 'https://www.polaris-pro.co.uk/events/', method: 'scrape', status: 'needs_scraper' },
  },
  WNO: {
    events: { url: 'https://www.flograppling.com/wno', method: 'scrape', status: 'needs_scraper' },
  },
};

// ─── OLYMPIC COMBAT SPORTS ─────────────────────────────────────────────────────

export const OLYMPIC_SOURCES = {
  IJF: {
    athletes: { url: 'https://www.ijf.org/judoka', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://www.ijf.org/calendar', method: 'scrape', status: 'needs_scraper' },
    rankings: { url: 'https://www.ijf.org/wrl', method: 'scrape', status: 'needs_scraper' },
  },
  UWW: {
    athletes: { url: 'https://uww.org/athletes/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://uww.org/events/', method: 'scrape', status: 'needs_scraper' },
    rankings: { url: 'https://uww.org/rankings/', method: 'scrape', status: 'needs_scraper' },
  },
  'World Taekwondo': {
    athletes: { url: 'https://worldtkd.simplycompete.com/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://worldtaekwondo.org/events/', method: 'scrape', status: 'needs_scraper' },
  },
  WKF: {
    athletes: { url: 'https://www.wkf.net/athletes/', method: 'scrape', status: 'needs_scraper' },
    events: { url: 'https://www.wkf.net/calendar/', method: 'scrape', status: 'needs_scraper' },
    rankings: { url: 'https://www.wkf.net/rankings/', method: 'scrape', status: 'needs_scraper' },
  },
  IWUF: {
    events: { url: 'https://www.iwuf.org/events/', method: 'scrape', status: 'needs_scraper' },
  },
  // Free API supplements
  TheSportsDB: {
    judo: { url: 'https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=', method: 'api', status: 'available', note: 'Supplement — verify against IJF' },
    wrestling: { url: 'https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=', method: 'api', status: 'available', note: 'Supplement — verify against UWW' },
  },
};

// ─── SOURCE RESOLUTION ─────────────────────────────────────────────────────────

const ALL_SOURCES = {
  MMA: MMA_SOURCES,
  Boxing: BOXING_SOURCES,
  Kickboxing: KICKBOXING_SOURCES,
  'Muay Thai': KICKBOXING_SOURCES,
  BJJ: GRAPPLING_SOURCES,
  'Submission Grappling': GRAPPLING_SOURCES,
  Judo: OLYMPIC_SOURCES,
  Wrestling: OLYMPIC_SOURCES,
  Taekwondo: OLYMPIC_SOURCES,
  Karate: OLYMPIC_SOURCES,
  'Kung Fu / Wushu': OLYMPIC_SOURCES,
  Sambo: null,
  Sumo: null,
  'Bare-Knuckle Boxing': null,
  Lethwei: null,
};

/**
 * Get all source URLs for a given organization.
 * Returns { athletes, events, rankings } with method + status.
 */
export function getOrganizationSources(organizationName, discipline) {
  const disciplineSources = ALL_SOURCES[discipline];
  if (!disciplineSources) return null;
  
  // Try exact org name match first
  if (disciplineSources[organizationName]) {
    return disciplineSources[organizationName];
  }

  // Try to find matching org
  for (const [key, sources] of Object.entries(disciplineSources)) {
    if (key.toLowerCase().includes(organizationName.toLowerCase()) ||
        organizationName.toLowerCase().includes(key.toLowerCase())) {
      return sources;
    }
  }

  return null;
}

/**
 * Get athlete profile URL for a specific fighter from their organization.
 */
export function getOfficialAthleteUrl(fighter) {
  if (!fighter || !fighter.organization) return null;

  const sources = getOrganizationSources(fighter.organization, fighter.discipline);
  if (!sources?.athletes) return null;

  // Try stored org-specific URLs first
  if (fighter.ufc_url && fighter.organization === 'UFC') return fighter.ufc_url;
  if (fighter.one_url && fighter.organization?.includes('ONE')) return fighter.one_url;
  if (fighter.boxrec_url && fighter.discipline === 'Boxing') return fighter.boxrec_url;
  if (fighter.ibjjf_url && fighter.organization?.includes('IBJJF')) return fighter.ibjjf_url;
  if (fighter.adcc_url && fighter.organization?.includes('ADCC')) return fighter.adcc_url;

  return null;
}

/**
 * Get available and unavailable sources summary for an organization.
 * Returns { available: [], needs_scraper: [], needs_key: [], unavailable: [] }
 */
export function getSourceStatusSummary(organizationName, discipline) {
  const sources = getOrganizationSources(organizationName, discipline);
  if (!sources) return { available: [], needs_scraper: [], needs_key: [], unavailable: [], note: 'No sources defined for this org/discipline' };

  const summary = { available: [], needs_scraper: [], needs_key: [], unavailable: [] };
  for (const [key, source] of Object.entries(sources)) {
    if (typeof source === 'object' && source.status) {
      summary[source.status === 'available' ? 'available' : source.status]?.push({
        type: key,
        url: source.url,
        method: source.method,
        note: source.note || null,
      });
    }
  }
  return summary;
}