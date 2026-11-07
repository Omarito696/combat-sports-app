/**
 * FightTracker Verification Engine v2
 * 
 * Validates actual data quality, not just status flags.
 * Every field requires a source. Every result requires verification.
 * 
 * Display Tiers:
 *   verified_upcoming     — Fully verified future fight/event with sources.
 *   verified_historical   — Fully verified past fight/event with result sources.
 *   partial_event_needs_data — Real event, card incomplete. Display with warning.
 *   admin_review          — Data conflict, missing sources, or low confidence. Display with flag.
 *   quarantined_unverified — Cannot verify. Do NOT display publicly.
 */

export const DISPLAY_TIER = {
  VERIFIED_UPCOMING: 'verified_upcoming',
  VERIFIED_HISTORICAL: 'verified_historical',
  PARTIAL_EVENT_NEEDS_DATA: 'partial_event_needs_data',
  ADMIN_REVIEW: 'admin_review',
  QUARANTINED_UNVERIFIED: 'quarantined_unverified',
};

export const TIER_LABELS = {
  verified_upcoming: 'Verified upcoming',
  verified_historical: 'Verified historical',
  partial_event_needs_data: 'Card incomplete — additional data required',
  admin_review: 'Under review — source or data validation needed',
  quarantined_unverified: 'Unverified — cannot display',
};

// ─── RECORD PLAUSIBILITY ──────────────────────────────────────────────────────

/**
 * Check if a fighter's record is plausibly real.
 * Catches impossible records like 46-49 or 0-200.
 */
function isRecordPlausible(fighter) {
  const wins = fighter.wins || 0;
  const losses = fighter.losses || 0;
  const total = wins + losses + (fighter.draws || 0) + (fighter.no_contests || 0);
  
  // Impossible: negative values
  if (wins < 0 || losses < 0) return { plausible: false, reason: 'Negative record values' };
  
  // Impossible: 0-0 for a major org fighter with data_confidence high
  // (valid for stubs and judokas)
  
  // Suspicious: absurd ratio
  if (losses > 0 && wins > 0) {
    const ratio = wins / losses;
    if (ratio > 50) return { plausible: false, reason: `Implausible win/loss ratio (${wins}-${losses})` };
    if (losses / wins > 30) return { plausible: false, reason: `Implausible loss/win ratio (${wins}-${losses})` };
  }
  
  // MMA/Kickboxing: >50 total fights is unusual unless ONE/Muay Thai fighter
  if (['MMA', 'Kickboxing'].includes(fighter.discipline) && total > 60) {
    if (!fighter.one_url && !fighter.organization?.includes('ONE')) {
      return { plausible: false, reason: `Unusual fight count (${total}) for ${fighter.discipline} — verify independently` };
    }
  }
  
  // Boxing: >80 fights is unusual for active modern boxers (old-timers had more)
  if (fighter.discipline === 'Boxing' && total > 70 && fighter.status === 'Active') {
    return { plausible: false, reason: `Unusually high fight count (${total}) for active boxer — verify` };
  }
  
  // Muay Thai: 200+ fights is normal for Thai fighters
  // No check needed
  
  return { plausible: true };
}

// ─── FIGHT VERIFICATION ────────────────────────────────────────────────────────

/**
 * Verify an upcoming (scheduled) fight.
 * Requires: real event, future date, both fighters in DB, no conflicts.
 */
export function verifyUpcomingFight(fight, event, fighters, allFights = []) {
  const issues = [];
  const fighterMap = Object.fromEntries(fighters.map(f => [f.name.toLowerCase(), f]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!event) {
    return { tier: DISPLAY_TIER.QUARANTINED_UNVERIFIED, valid: false, issues: ['No associated event'], displayable: false };
  }

  if (!event.date) issues.push('Event has no date');
  const eventDate = event.date ? new Date(event.date) : null;
  if (eventDate && isNaN(eventDate.getTime())) issues.push('Invalid event date');
  if (eventDate && eventDate < today) issues.push(`Event date (${event.date.slice(0, 10)}) is in the past`);
  if (event.status === 'completed') issues.push('Event marked completed but fight is scheduled');
  if (event.status === 'cancelled') issues.push('Event is cancelled');

  // Fighter existence check
  const fighterA = fighterMap[fight.fighter_a_name?.toLowerCase()];
  const fighterB = fighterMap[fight.fighter_b_name?.toLowerCase()];
  if (!fighterA) issues.push(`Fighter "${fight.fighter_a_name}" not in database`);
  if (!fighterB) issues.push(`Fighter "${fight.fighter_b_name}" not in database`);

  // Fighter record plausibility
  if (fighterA) {
    const pa = isRecordPlausible(fighterA);
    if (!pa.plausible) issues.push(`Fighter A record issue: ${pa.reason}`);
  }
  if (fighterB) {
    const pb = isRecordPlausible(fighterB);
    if (!pb.plausible) issues.push(`Fighter B record issue: ${pb.reason}`);
  }

  // Source check: event should have date_source_url or card_source_url
  if (!event.date_source_url && !event.card_source_url && event.event_confidence !== 'high') {
    issues.push('Event has no verified source URL');
  }

  // Conflict check
  if (allFights.length > 0) {
    const dupes = allFights.filter(f => {
      if (f.id === fight.id) return false;
      const names = [f.fighter_a_name?.toLowerCase(), f.fighter_b_name?.toLowerCase()].sort();
      const thisNames = [fight.fighter_a_name?.toLowerCase(), fight.fighter_b_name?.toLowerCase()].sort();
      return names[0] === thisNames[0] && names[1] === thisNames[1] && f.status === 'completed';
    });
    if (dupes.length > 0) {
      issues.push(`Matchup already exists as completed fight — possible rematch or data conflict`);
    }
  }

  if (issues.length === 0) {
    return { tier: DISPLAY_TIER.VERIFIED_UPCOMING, valid: true, issues: [], displayable: true };
  }

  // Missing fighters or past date → admin review
  const majorIssues = issues.filter(i => 
    i.includes('past') || i.includes('completed') || i.includes('not in database') || 
    i.includes('record issue') || i.includes('no verified source')
  );
  if (majorIssues.length > 0) {
    return { tier: DISPLAY_TIER.ADMIN_REVIEW, valid: false, issues, displayable: true };
  }

  return { tier: DISPLAY_TIER.PARTIAL_EVENT_NEEDS_DATA, valid: false, issues, displayable: true };
}

/**
 * Verify a historical (completed) fight.
 * REQUIRES result source — no fabricated results pass verification.
 * Must have: event, winner, method, result_source_url (or medium+ result_confidence).
 */
export function verifyHistoricalFight(fight, event, fighters) {
  const issues = [];
  const fighterMap = Object.fromEntries(fighters.map(f => [f.name.toLowerCase(), f]));

  if (!event) {
    return { tier: DISPLAY_TIER.QUARANTINED_UNVERIFIED, valid: false, issues: ['No associated event'], displayable: false };
  }

  // Result completeness
  if (!fight.winner_name) issues.push('No winner recorded');
  if (!fight.method) issues.push('No method recorded');

  // RESULT SOURCE — CRITICAL: fabricated results can't pass
  const hasSource = fight.result_source_url || (fight.result_confidence && ['high', 'medium'].includes(fight.result_confidence));
  if (!hasSource) {
    issues.push('No result source URL or confidence — result may be fabricated');
  }

  // Fighter check
  if (!fighterMap[fight.fighter_a_name?.toLowerCase()]) issues.push(`Fighter "${fight.fighter_a_name}" not in database`);
  if (!fighterMap[fight.fighter_b_name?.toLowerCase()]) issues.push(`Fighter "${fight.fighter_b_name}" not in database`);

  // Fighter record plausibility
  const a = fighterMap[fight.fighter_a_name?.toLowerCase()];
  const b = fighterMap[fight.fighter_b_name?.toLowerCase()];
  if (a) {
    const pa = isRecordPlausible(a);
    if (!pa.plausible) issues.push(`Fighter A record issue: ${pa.reason}`);
  }
  if (b) {
    const pb = isRecordPlausible(b);
    if (!pb.plausible) issues.push(`Fighter B record issue: ${pb.reason}`);
  }

  // Event consistency: completed fight on upcoming event = suspicious
  if (event.status === 'upcoming' && fight.status === 'completed') {
    issues.push('Completed fight on upcoming event — data mismatch');
  }

  if (issues.length === 0) {
    return { tier: DISPLAY_TIER.VERIFIED_HISTORICAL, valid: true, issues: [], displayable: true };
  }

  // Missing result source → admin_review (show with warning, not hide)
  const sourceIssue = issues.some(i => i.includes('result source'));
  const hasBothFighters = !!a && !!b;
  
  if (sourceIssue && hasBothFighters && fight.winner_name && fight.method) {
    // Has all result data but no source → admin review (show with flag)
    return { tier: DISPLAY_TIER.ADMIN_REVIEW, valid: false, issues, displayable: true };
  }

  // Missing results entirely → quarantined
  const noResult = !fight.winner_name || !fight.method;
  if (noResult) {
    if (hasBothFighters && event) {
      return { tier: DISPLAY_TIER.ADMIN_REVIEW, valid: false, issues, displayable: true };
    }
    return { tier: DISPLAY_TIER.QUARANTINED_UNVERIFIED, valid: false, issues, displayable: false };
  }

  return { tier: DISPLAY_TIER.ADMIN_REVIEW, valid: false, issues, displayable: true };
}

// ─── EVENT VERIFICATION ─────────────────────────────────────────────────────────

/**
 * Verify an event.
 * Now checks: event source URLs, date sanity, and fight-level verifications.
 */
export function verifyEvent(event, fights = [], fighters = []) {
  const issues = [];
  const eventFights = fights.filter(f => f.event_id === event.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!event.name) return { tier: DISPLAY_TIER.QUARANTINED_UNVERIFIED, valid: false, issues: ['No event name'], fight_count: 0, verified_fight_count: 0, missing_fight_count: 0, fight_verifications: [], displayable: false };
  if (!event.date) issues.push('Missing date');
  if (event.date && isNaN(new Date(event.date).getTime())) issues.push('Invalid date');

  const eventDate = event.date ? new Date(event.date) : null;
  const isFuture = eventDate && eventDate >= today;

  // Source check
  if (!event.date_source_url && !event.card_source_url) {
    issues.push('Event has no verified source URL');
  }

  // Date sanity: if event is "upcoming" but date is clearly past
  if (event.status === 'upcoming' && eventDate && eventDate < today) {
    issues.push(`Event marked upcoming but date (${event.date.slice(0, 10)}) is in the past`);
  }

  // Verify each fight
  let verifiedCount = 0;
  let adminReviewCount = 0;
  let quarantinedCount = 0;
  const fight_verifications = eventFights.map(f => {
    let v;
    if (f.status === 'scheduled') {
      v = verifyUpcomingFight(f, event, fighters, fights);
    } else if (f.status === 'completed') {
      v = verifyHistoricalFight(f, event, fighters);
    } else {
      v = { tier: DISPLAY_TIER.QUARANTINED_UNVERIFIED, valid: false, issues: ['Unknown or cancelled status'] };
    }
    
    if (v.tier === DISPLAY_TIER.VERIFIED_UPCOMING || v.tier === DISPLAY_TIER.VERIFIED_HISTORICAL) verifiedCount++;
    else if (v.tier === DISPLAY_TIER.ADMIN_REVIEW) adminReviewCount++;
    else quarantinedCount++;
    
    return { fight: f, verification: v };
  });

  const totalFights = eventFights.length;
  const missingFights = totalFights - verifiedCount;

  // No fights
  if (totalFights === 0) {
    const tier = isFuture ? DISPLAY_TIER.PARTIAL_EVENT_NEEDS_DATA : DISPLAY_TIER.QUARANTINED_UNVERIFIED;
    return { tier, valid: false, issues: [...issues, 'No fights on card — needs data acquisition'], fight_count: 0, verified_fight_count: 0, missing_fight_count: 0, fight_verifications, displayable: tier === DISPLAY_TIER.PARTIAL_EVENT_NEEDS_DATA };
  }

  // All verified
  if (verifiedCount === totalFights) {
    const tier = isFuture ? DISPLAY_TIER.VERIFIED_UPCOMING : DISPLAY_TIER.VERIFIED_HISTORICAL;
    return { tier, valid: true, issues, fight_count: totalFights, verified_fight_count: verifiedCount, missing_fight_count: 0, fight_verifications, displayable: true };
  }

  // Mixed
  if (verifiedCount > 0 && missingFights > 0) {
    return { tier: DISPLAY_TIER.PARTIAL_EVENT_NEEDS_DATA, valid: false, issues: [...issues, `${missingFights} of ${totalFights} fights not fully verified`], fight_count: totalFights, verified_fight_count: verifiedCount, missing_fight_count: missingFights, fight_verifications, displayable: true };
  }

  // All review/quarantined
  if (verifiedCount === 0) {
    const tier = adminReviewCount > 0 ? DISPLAY_TIER.ADMIN_REVIEW : DISPLAY_TIER.QUARANTINED_UNVERIFIED;
    return { tier, valid: false, issues: [...issues, 'All fights on card are unverified'], fight_count: totalFights, verified_fight_count: 0, missing_fight_count: totalFights, fight_verifications, displayable: tier === DISPLAY_TIER.ADMIN_REVIEW };
  }

  return { tier: DISPLAY_TIER.ADMIN_REVIEW, valid: false, issues, fight_count: totalFights, verified_fight_count: verifiedCount, missing_fight_count: missingFights, fight_verifications, displayable: true };
}

// ─── FIGHTER VERIFICATION ──────────────────────────────────────────────────────

/**
 * Verify fighter data integrity.
 * Validates: record plausibility, stable IDs, image quality.
 */
export function verifyFighter(fighter) {
  const issues = [];

  if (!fighter.name) return { tier: DISPLAY_TIER.QUARANTINED_UNVERIFIED, issues: ['No name'], displayable: false };

  // Record plausibility
  const record = isRecordPlausible(fighter);
  if (!record.plausible) issues.push(`Record implausible: ${record.reason}`);

  // Stable ID check
  const hasStableId = fighter.wikidata_id || fighter.thesportsdb_id || 
    fighter.ufc_url || fighter.one_url || fighter.tapology_url || 
    fighter.sherdog_url || fighter.boxrec_url || fighter.ibjjf_url || fighter.adcc_url;

  if (!hasStableId && fighter.data_confidence === 'high') {
    issues.push('Marked high confidence but has no stable identifier');
  }

  if (!hasStableId && fighter.data_quality !== 'stub') {
    issues.push('No stable identifier — data may be mismatched');
  }

  // Record source check
  if ((fighter.wins > 0 || fighter.losses > 0) && !fighter.record_source_url && fighter.record_confidence !== 'high') {
    issues.push('Has record but no record source URL');
  }

  // Image quality
  if (fighter.image_confidence === 'rejected') {
    issues.push('Image rejected — needs replacement');
  }
  
  if (!fighter.image_url && !fighter.preferred_profile_image_url && fighter.image_confidence !== 'rejected') {
    if (fighter.data_quality === 'verified') {
      issues.push('Verified fighter missing image');
    }
  }

  // Source type validation for images
  if (fighter.image_source_type === 'wikipedia' && fighter.image_confidence === 'approved') {
    issues.push('Wikipedia image marked as approved — should be official org source');
  }

  if (issues.length === 0 && fighter.data_quality === 'verified') {
    return { tier: DISPLAY_TIER.VERIFIED_HISTORICAL, issues, displayable: true };
  }
  
  if (issues.length === 0) {
    return { tier: DISPLAY_TIER.VERIFIED_HISTORICAL, issues, displayable: true };
  }

  if (fighter.needs_admin_review || issues.length > 0) {
    return { tier: DISPLAY_TIER.ADMIN_REVIEW, issues, displayable: true };
  }

  return { tier: DISPLAY_TIER.VERIFIED_HISTORICAL, issues: [], displayable: true };
}

// ─── CONFLICT DETECTION ────────────────────────────────────────────────────────

export function detectFightConflict(fight, allFights, allEvents) {
  const eventMap = Object.fromEntries(allEvents.map(e => [e.id, e]));
  const names = [fight.fighter_a_name?.toLowerCase(), fight.fighter_b_name?.toLowerCase()].sort();

  const dupes = allFights.filter(f => {
    if (f.id === fight.id) return false;
    const fNames = [f.fighter_a_name?.toLowerCase(), f.fighter_b_name?.toLowerCase()].sort();
    return fNames[0] === names[0] && fNames[1] === names[1];
  });

  if (dupes.length === 0) {
    return { hasConflict: false, type: null, message: null, duplicates: [] };
  }

  const completedDupes = dupes.filter(d => d.status === 'completed');
  const scheduledDupes = dupes.filter(d => d.status === 'scheduled');

  if (fight.status === 'scheduled' && completedDupes.length > 0) {
    return {
      hasConflict: true,
      type: 'upcoming_duplicates_history',
      message: `Matchup already occurred as completed: ${completedDupes.map(d => `${d.fighter_a_name} vs ${d.fighter_b_name}`).join(', ')}`,
      duplicates: completedDupes,
    };
  }

  if (fight.status === 'completed' && scheduledDupes.length > 0) {
    return {
      hasConflict: true,
      type: 'history_also_scheduled',
      message: `Completed fight also appears as scheduled elsewhere`,
      duplicates: scheduledDupes,
    };
  }

  return {
    hasConflict: true,
    type: 'duplicate_matchup',
    message: `Same matchup exists in ${dupes.length} other fight(s)`,
    duplicates: dupes,
  };
}

// ─── REMATCH NUMBERING ─────────────────────────────────────────────────────────

export function detectRematchNumber(fight, allFights) {
  const nameA = fight.fighter_a_name?.toLowerCase();
  const nameB = fight.fighter_b_name?.toLowerCase();
  if (!nameA || !nameB) return { number: null, is_rematch: false };

  const priorMeetings = allFights.filter(f => {
    if (f.id === fight.id) return false;
    const fA = f.fighter_a_name?.toLowerCase();
    const fB = f.fighter_b_name?.toLowerCase();
    return (fA === nameA && fB === nameB) || (fA === nameB && fB === nameA);
  }).filter(f => f.status === 'completed');

  if (priorMeetings.length === 0) {
    return { number: null, is_rematch: false };
  }

  return { number: priorMeetings.length + 1, is_rematch: true, prior_meeting_count: priorMeetings.length };
}

// ─── AUDIT ──────────────────────────────────────────────────────────────────────

export function auditAll(events, fights, fighters) {
  const eventAudits = events.map(e => ({
    event: e,
    verification: verifyEvent(e, fights, fighters),
  }));

  const fightAudits = fights.map(f => {
    const event = events.find(e => e.id === f.event_id);
    if (f.status === 'scheduled') {
      return { fight: f, event, verification: verifyUpcomingFight(f, event, fighters, fights) };
    }
    return { fight: f, event, verification: verifyHistoricalFight(f, event, fighters) };
  });

  const fighterAudits = fighters.map(f => ({
    fighter: f,
    verification: verifyFighter(f),
  }));

  const eventByTier = {};
  const fightByTier = {};
  const fighterByTier = {};

  for (const a of eventAudits) {
    const t = a.verification.tier;
    if (!eventByTier[t]) eventByTier[t] = [];
    eventByTier[t].push(a);
  }
  for (const a of fightAudits) {
    const t = a.verification.tier;
    if (!fightByTier[t]) fightByTier[t] = [];
    fightByTier[t].push(a);
  }
  for (const a of fighterAudits) {
    const t = a.verification.tier;
    if (!fighterByTier[t]) fighterByTier[t] = [];
    fighterByTier[t].push(a);
  }

  return {
    summary: {
      total_events: events.length,
      total_fights: fights.length,
      total_fighters: fighters.length,
      events: Object.fromEntries(Object.entries(eventByTier).map(([k,v]) => [k, v.length])),
      fights: Object.fromEntries(Object.entries(fightByTier).map(([k,v]) => [k, v.length])),
      fighters: Object.fromEntries(Object.entries(fighterByTier).map(([k,v]) => [k, v.length])),
    },
    events: eventAudits,
    fights: fightAudits,
    fighters: fighterAudits,
  };
}

// ─── DATA MERGE SAFETY ─────────────────────────────────────────────────────────

/**
 * FIELD-LEVEL CONFIDENCE CHECK
 * Determines whether a new field value can replace an existing one.
 * Returns: { can_overwrite: bool, reason: str }
 * 
 * Rules:
 *   1. Never overwrite a field with higher confidence with lower confidence
 *   2. Never overwrite an official_org source with wikipedia/sports_db
 *   3. Never overwrite a manually set admin override (preferred_profile_image_url)
 *   4. Never overwrite verified (data_quality=verified) fields with auto data
 */
export function canOverwriteField(existingValue, existingConfidence, existingSourceType, newValue, newConfidence, newSourceType, fieldName) {
  // Null/empty existing → always safe to fill
  if (existingValue == null || existingValue === '' || existingValue === 0) {
    return { can_overwrite: true, reason: 'Field was empty' };
  }

  // Same value → no change needed
  if (existingValue === newValue) {
    return { can_overwrite: false, reason: 'Same value — no change' };
  }

  // Confidence hierarchy: high > medium > low
  const CONF_RANK = { high: 3, medium: 2, low: 1, undefined: 0 };
  const existingRank = CONF_RANK[existingConfidence] || 0;
  const newRank = CONF_RANK[newConfidence] || 0;

  if (newRank < existingRank) {
    return { can_overwrite: false, reason: `New confidence (${newConfidence}) is lower than existing (${existingConfidence})` };
  }

  // Source type hierarchy: official_org > manual > sports_db > wikipedia > unknown
  const SOURCE_RANK = { official_org: 5, manual: 4, sports_db: 3, wikipedia: 2, wikimedia: 2, unknown: 1, undefined: 0 };
  const existingSourceRank = SOURCE_RANK[existingSourceType] || 0;
  const newSourceRank = SOURCE_RANK[newSourceType] || 0;

  if (newSourceRank < existingSourceRank) {
    return { can_overwrite: false, reason: `New source type (${newSourceType}) is lower quality than existing (${existingSourceType})` };
  }

  // Admin overrides (preferred_profile_image_url, record_source_type=manual) — never auto-overwrite
  if (fieldName === 'preferred_profile_image_url' && existingValue) {
    return { can_overwrite: false, reason: 'Admin override — manual change only' };
  }

  // Same confidence and source type → allow update (data correction)
  if (newRank === existingRank && newSourceRank === existingSourceRank) {
    return { can_overwrite: true, reason: 'Same confidence/source level — updating with potentially corrected data' };
  }

  return { can_overwrite: true, reason: 'Higher quality source replacing lower quality' };
}