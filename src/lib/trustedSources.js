/**
 * FightTracker Trusted Source Registry
 * 
 * Canonical list of verified data sources organized by:
 * - Discipline & organization
 * - Data type (fighter records, event dates, fight results, images)
 * - Priority tier (official_org > sports_db > news > manual)
 * 
 * ONLY sources listed here should be used for automated data acquisition.
 * Manual admin review should handle sources outside this registry.
 */

export const TRUSTED_SOURCES = {
  // ─── MMA ──────────────────────────────────────────────────────────
  MMA: {
    UFC: {
      fighter_records: {
        url: 'http://ufcstats.com/fighter-details/{fighter_id}',
        type: 'official_org',
        priority: 5,
        notes: 'Per-fighter stats page. Direct UFC database. Most authoritative for UFC fighters.',
        examples: [
          'http://ufcstats.com/fighter-details/54f64b5e283b0ce7 (Ilia Topuria)',
          'http://ufcstats.com/fighter-details/9e8f6c728eb01124 (Justin Gaethje)',
          'http://ufcstats.com/fighter-details/b50a426a33da0012 (Sean O\'Malley)',
          'http://ufcstats.com/fighter-details/d802174b0c0c1f4e (Magomed Ankalaev)',
        ],
      },
      athlete_profile: {
        url: 'https://www.ufc.com/athlete/{slug}',
        type: 'official_org',
        priority: 5,
        notes: 'UFC athlete profile page. Contains bio, record, upcoming fights.',
        examples: ['https://www.ufc.com/athlete/ciryl-gane'],
      },
      event_details: {
        url: 'https://www.ufc.com/event/{event_slug}',
        type: 'official_org',
        priority: 5,
        notes: 'Official event page with full card, results, and highlights.',
        examples: [
          'https://www.ufc.com/event/ufc-313',
          'https://www.ufc.com/event/ufc-311',
          'https://www.ufc.com/event/ufc-308',
          'https://www.ufc.com/event/ufc-280',
          'https://www.ufc.com/event/ufc-310',
        ],
      },
      event_results_article: {
        url: 'https://www.ufc.com/news/{event-slug}-results-highlights-interviews',
        type: 'official_org',
        priority: 5,
        notes: 'Post-event article with full results, method, round, time.',
      },
    },
    ONE: {
      athlete_profile: {
        url: 'https://www.onefc.com/athletes/{slug}/',
        type: 'official_org',
        priority: 5,
        notes: 'ONE Championship athlete profile. Primary source for ONE fighters.',
      },
      event_details: {
        url: 'https://onefc.com/events/{event_slug}/',
        type: 'official_org',
        priority: 5,
      },
    },
    Tapology: {
      fighter_page: {
        url: 'https://www.tapology.com/fightcenter/fighters/{fighter_id}-{slug}',
        type: 'sports_db',
        priority: 3,
        notes: 'Community-driven MMA database. Good for record verification when UFC Stats unavailable.',
      },
    },
    Sherdog: {
      fighter_page: {
        url: 'https://www.sherdog.com/fighter/{slug}-{id}',
        type: 'sports_db',
        priority: 3,
        notes: 'Longstanding MMA record database.',
      },
    },
    ESPN: {
      fight_center: {
        url: 'https://www.espn.com/mma/fightcenter/_/id/{fight_id}',
        type: 'sports_db',
        priority: 3,
        notes: 'ESPN fightcenter — reliable secondary source for results.',
      },
      news_article: {
        url: 'https://www.espn.com/mma/story/_/id/{article_id}',
        type: 'news',
        priority: 2,
      },
    },
    YahooSports: {
      mma_news: {
        url: 'https://sports.yahoo.com/mma/',
        type: 'news',
        priority: 2,
        notes: 'MMA news coverage for event announcements and fight results.',
      },
    },
  },

  // ─── KICKBOXING ────────────────────────────────────────────────────
  Kickboxing: {
    GLORY: {
      athlete_profile: {
        url: 'https://glorykickboxing.com/fighters/{slug}',
        type: 'official_org',
        priority: 5,
        notes: 'GLORY official fighter profile.',
      },
      event_details: {
        url: 'https://glorykickboxing.com/events/{slug}',
        type: 'official_org',
        priority: 5,
      },
    },
    BeyondKick: {
      event_results: {
        url: 'https://beyondkick.com/news/{event_slug}-results/',
        type: 'sports_db',
        priority: 3,
        notes: 'Reliable kickboxing news & results site.',
      },
    },
  },

  // ─── BOXING ────────────────────────────────────────────────────────
  Boxing: {
    BoxRec: {
      fighter_page: {
        url: 'https://boxrec.com/en/box-pro/{boxer_id}',
        type: 'sports_db',
        priority: 3,
        notes: 'Primary boxing record database. Most authoritative for boxing records.',
        examples: ['https://boxrec.com/en/box-pro/447121 (Terence Crawford)'],
      },
    },
    ESPN_Boxing: {
      fight_results: {
        url: 'https://www.espn.com/boxing/story/_/id/{article_id}',
        type: 'sports_db',
        priority: 3,
        notes: 'ESPN boxing coverage — used for Canelo vs Crawford verification.',
      },
    },
    BBC_Sport: {
      boxing_news: {
        url: 'https://www.bbc.com/sport/boxing',
        type: 'news',
        priority: 2,
      },
    },
  },

  // ─── BJJ / GRAPPLING ──────────────────────────────────────────────
  BJJ: {
    BJJHeroes: {
      fighter_page: {
        url: 'https://www.bjjheroes.com/bjj-fighters/{slug}',
        type: 'sports_db',
        priority: 3,
        notes: 'Comprehensive BJJ fighter database.',
      },
    },
    ADCC: {
      athlete_profile: {
        url: 'https://adcc.cc/athlete/{slug}',
        type: 'official_org',
        priority: 5,
        notes: 'Official ADCC athlete profile.',
      },
      event_results: {
        url: 'https://adcc.cc/events/{slug}',
        type: 'official_org',
        priority: 5,
      },
    },
    IBJJF: {
      athlete_profile: {
        url: 'https://ibjjf.com/athletes/{slug}',
        type: 'official_org',
        priority: 5,
      },
    },
  },

  // ─── JUDO ──────────────────────────────────────────────────────────
  Judo: {
    IJF: {
      athlete_profile: {
        url: 'https://www.ijf.org/judoka/{athlete_id}',
        type: 'official_org',
        priority: 5,
        notes: 'Official International Judo Federation athlete profile.',
        examples: ['https://www.ijf.org/judoka/5849 (Teddy Riner)'],
      },
      event_results: {
        url: 'https://www.ijf.org/competition/{event_id}',
        type: 'official_org',
        priority: 5,
      },
    },
  },

  // ─── WRESTLING ─────────────────────────────────────────────────────
  Wrestling: {
    UWW: {
      athlete_profile: {
        url: 'https://uww.org/athletes/{slug}',
        type: 'official_org',
        priority: 5,
        notes: 'United World Wrestling — official governing body.',
      },
    },
  },

  // ─── MULTI-DISCIPLINE ──────────────────────────────────────────────
  Multi: {
    Wikipedia: {
      fighter_page: {
        url: 'https://en.wikipedia.org/wiki/{page_title}',
        type: 'wikipedia',
        priority: 2,
        notes: 'Wikipedia — useful for biographical data and stable wikidata_id. NOT for fight records or results.',
      },
    },
    Wikidata: {
      entity_page: {
        url: 'https://www.wikidata.org/wiki/{wikidata_id}',
        type: 'wikipedia',
        priority: 2,
      },
    },
    TheSportsDB: {
      fighter_page: {
        url: 'https://www.thesportsdb.com/fighter/{id}',
        type: 'sports_db',
        priority: 3,
        notes: 'Sports database API. Secondary verification source.',
      },
      event_page: {
        url: 'https://www.thesportsdb.com/event/{id}',
        type: 'sports_db',
        priority: 3,
      },
    },
  },
};

// ─── SOURCE PRIORITY WEIGHTS ──────────────────────────────────────────

export const SOURCE_PRIORITY = {
  official_org: 5,   // UFC, ONE, GLORY, IJF, ADCC, BoxRec, IBJJF official pages
  manual: 4,         // Admin-overridden data
  sports_db: 3,      // Tapology, Sherdog, TheSportsDB, ESPN, BBC, BJJHeroes
  news: 2,           // News articles, Yahoo Sports, MMA Fighting
  wikipedia: 2,      // Wikipedia/Wikidata
  wikimedia: 2,      // Wikimedia images
  unknown: 1,        // Unknown/unattributed source
};

// ─── CONFIDENCE TIER WEIGHTS ─────────────────────────────────────────

export const CONFIDENCE_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
  undefined: 0,
};

// ─── FIELD-SPECIFIC PRIORITY RULES ────────────────────────────────────

/**
 * For each field type, the ideal source hierarchy:
 * 
 * FIGHTER RECORD (wins/losses/draws):
 *   1. official_org (UFC Stats, ONE profile, GLORY profile, IJF profile)
 *   2. sports_db (Tapology, Sherdog, BoxRec)
 *   3. wikipedia (NOT for MMA/Boxing — records often outdated)
 * 
 * FIGHT RESULT (winner, method, finish):
 *   1. official_org event results page/article
 *   2. sports_db (ESPN, Tapology, TheSportsDB)
 *   3. news articles
 *   4. admin manual review
 * 
 * EVENT DATE/VENUE:
 *   1. official_org event page
 *   2. sports_db
 *   3. news articles
 * 
 * FIGHTER IMAGE:
 *   1. official_org athlete profile (UFC, ONE, GLORY, IJF)
 *   2. media_day or publicity_headshot
 *   3. sports_db (TheSportsDB)
 *   4. wikipedia/wikimedia (ONLY as fallback)
 * 
 * FIGHTER BIOGRAPHY:
 *   1. official_org athlete profile
 *   2. wikipedia
 *   3. sports_db
 */

// ─── NEVER-OVERWRITE FIELDS ────────────────────────────────────────────

/**
 * Fields that should NEVER be overwritten by automated data acquisition:
 * - preferred_profile_image_url (admin manual override only)
 * - record_source_url when existing is official_org (cannot be downgraded)
 * - Any field where existing confidence >= new confidence
 */

// ─── PLATFORM-SPECIFIC FIGHTER IDS ────────────────────────────────────

/**
 * Stable cross-platform fighter identifiers for matching:
 * Priority order:
 *   1. wikidata_id (universal)
 *   2. ufc_url / one_url / boxrec_url / ibjjf_url / adcc_url (org-specific)
 *   3. thesportsdb_id (cross-sport database)
 *   4. sherdog_url / tapology_url (MMA databases)
 *   5. wikipedia_url (name matching fallback)
 */

export const STABLE_ID_PRIORITY = [
  'wikidata_id',
  'ufc_url',
  'one_url', 
  'boxrec_url',
  'ibjjf_url',
  'adcc_url',
  'thesportsdb_id',
  'sherdog_url',
  'tapology_url',
  'wikipedia_url',
];

// ─── VALIDATION RULES ─────────────────────────────────────────────────

/**
 * Minimum source requirements by data type:
 * 
 * Fighter record → must have record_source_url OR record_confidence ≥ high
 * Fight result → must have result_source_url OR (result_confidence ≥ high AND method)
 * Event date → must have date_source_url OR event_confidence ≥ high
 * Fighter image → must have image_source_type AND image_confidence ≠ rejected
 */