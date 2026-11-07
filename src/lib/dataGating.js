/**
 * FightTracker Data Gating Module
 * 
 * Controls what reaches the UI based on verification tiers.
 * PRINCIPLE: Show everything that can be shown — hide only what must be hidden.
 * Incomplete/pending items show with appropriate warnings, not blank pages.
 */

import {
  DISPLAY_TIER,
  verifyUpcomingFight,
  verifyHistoricalFight,
  verifyEvent,
  detectFightConflict,
} from './verification';

// ─── PUBLIC TIERS (displayable) ──────────────────────────────────────────────

const PUBLIC_TIERS = [
  DISPLAY_TIER.VERIFIED_UPCOMING,
  DISPLAY_TIER.VERIFIED_HISTORICAL,
  DISPLAY_TIER.PARTIAL_EVENT_NEEDS_DATA,
  DISPLAY_TIER.ADMIN_REVIEW,
];

const HIDDEN_TIERS = [
  DISPLAY_TIER.QUARANTINED_UNVERIFIED,
  DISPLAY_TIER.DELETED_FICTIONAL,
];

// ─── FIGHT FILTERS ────────────────────────────────────────────────────────────

/**
 * Categorize fights by verification tier.
 * Returns { verified, needs_review, quarantined } arrays.
 * Verified = fully verified upcoming or historical.
 * Needs_review = admin_review tier (show with warning).
 * Quarantined = unverified/fictional (hide from public).
 */
export function categorizeFights(fights, events, fighters) {
  const eventMap = Object.fromEntries(events.map(e => [e.id, e]));
  const verified = [];
  const needsReview = [];
  const quarantined = [];

  for (const fight of fights) {
    const event = eventMap[fight.event_id];
    let verification;

    if (fight.status === 'scheduled') {
      verification = verifyUpcomingFight(fight, event, fighters, fights);
    } else if (fight.status === 'completed') {
      verification = verifyHistoricalFight(fight, event, fighters);
    } else {
      verification = { tier: DISPLAY_TIER.QUARANTINED_UNVERIFIED, valid: false, issues: ['Unknown status'] };
    }

    const obj = { fight, event, verification };

    if (verification.tier === DISPLAY_TIER.VERIFIED_UPCOMING || verification.tier === DISPLAY_TIER.VERIFIED_HISTORICAL) {
      verified.push(obj);
    } else if (verification.tier === DISPLAY_TIER.ADMIN_REVIEW) {
      needsReview.push(obj);
    } else {
      quarantined.push(obj);
    }
  }

  return { verified, needsReview, quarantined };
}

/**
 * Get displayable fights — all public tiers.
 * Returns array of { fight, event, verification }.
 */
export function getDisplayableFights(fights, events, fighters) {
  const { verified, needsReview } = categorizeFights(fights, events, fighters);
  return [...verified, ...needsReview];
}

/**
 * Get only fully verified fights.
 */
export function getVerifiedFights(fights, events, fighters) {
  const { verified } = categorizeFights(fights, events, fighters);
  return verified.map(v => v.fight);
}

// ─── EVENT FILTERS ────────────────────────────────────────────────────────────

/**
 * Categorize events by verification tier.
 * Returns { verified, partial, needs_review, quarantined } arrays.
 * 
 * Verified = all fights verified.
 * Partial = real event, incomplete card — SHOW IT with warning.
 * Needs_review = data conflict — show with flag.
 * Quarantined = cannot verify — hide.
 */
export function categorizeEvents(events, fights, fighters) {
  const verified = [];
  const partial = [];
  const needsReview = [];
  const quarantined = [];

  for (const event of events) {
    const verification = verifyEvent(event, fights, fighters);
    const obj = { event, verification };

    if (verification.tier === DISPLAY_TIER.VERIFIED_UPCOMING || verification.tier === DISPLAY_TIER.VERIFIED_HISTORICAL) {
      verified.push(obj);
    } else if (verification.tier === DISPLAY_TIER.PARTIAL_EVENT_NEEDS_DATA) {
      partial.push(obj);
    } else if (verification.tier === DISPLAY_TIER.ADMIN_REVIEW) {
      needsReview.push(obj);
    } else {
      quarantined.push(obj);
    }
  }

  return { verified, partial, needsReview, quarantined };
}

/**
 * Get displayable events — all public tiers (including partial).
 * Returns array of { event, verification }.
 */
export function getDisplayableEvents(events, fights, fighters) {
  const { verified, partial, needsReview } = categorizeEvents(events, fights, fighters);
  return [...verified, ...partial, ...needsReview];
}

// ─── UPCOMING-SPECIFIC FILTERS ────────────────────────────────────────────────

/**
 * Get fully verified upcoming fights.
 * Only fights passing ALL verification gates.
 */
export function filterDisplayableUpcomingFights(fights, events, fighters) {
  const { verified } = categorizeFights(fights, events, fighters);
  return verified
    .filter(v => v.verification.tier === DISPLAY_TIER.VERIFIED_UPCOMING)
    .map(v => v.fight);
}

/**
 * Get historical fights (verified + needs_review).
 */
export function filterDisplayableHistoricalFights(fights, events, fighters) {
  const { verified, needsReview } = categorizeFights(fights, events, fighters);
  return [...verified.filter(v => v.verification.tier === DISPLAY_TIER.VERIFIED_HISTORICAL), ...needsReview].map(v => v.fight);
}

/**
 * Get upcoming events — verified + partial (do NOT hide partial).
 */
export function filterDisplayableUpcomingEvents(events, fights, fighters) {
  const { verified, partial, needsReview } = categorizeEvents(events, fights, fighters);
  return [...verified, ...partial, ...needsReview]
    .filter(e => {
      const d = e.event.date ? new Date(e.event.date) : null;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return d && d >= today;
    })
    .filter(e => e.event.status !== 'completed' && e.event.status !== 'cancelled')
    .map(e => e.event);
}

/**
 * Group displayable upcoming fights by date for the home page schedule.
 */
export function groupUpcomingFightsByDate(fights, events, fighters) {
  const displayable = filterDisplayableUpcomingFights(fights, events, fighters);
  const eventMap = Object.fromEntries(events.map(e => [e.id, e]));

  const byDate = {};
  for (const fight of displayable) {
    const event = eventMap[fight.event_id];
    if (!event?.date) continue;
    const dateKey = new Date(event.date).toISOString().slice(0, 10);
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(fight);
  }

  return Object.entries(byDate)
    .map(([dateStr, fights]) => ({
      date: new Date(dateStr),
      fights: fights.sort((a, b) => (a.order || 0) - (b.order || 0)),
    }))
    .sort((a, b) => a.date - b.date);
}

// ─── CONVENIENCE ──────────────────────────────────────────────────────────────

/**
 * Get display status for a single fight.
 * Returns { tier, label, displayable, verification }
 */
export function getFightDisplayStatus(fight, events, fighters, allFights) {
  const event = events.find(e => e.id === fight.event_id);
  let verification;
  if (fight.status === 'scheduled') {
    verification = verifyUpcomingFight(fight, event, fighters, allFights);
  } else {
    verification = verifyHistoricalFight(fight, event, fighters);
  }
  return {
    ...verification,
    label: verification.tier ? (TIER_LABELS[verification.tier] || verification.tier) : 'Unknown',
  };
}

const TIER_LABELS = {
  verified_upcoming: 'Verified upcoming',
  verified_historical: 'Verified historical',
  partial_event_needs_data: 'Card incomplete — additional data required',
  admin_review: 'Under review',
  quarantined_unverified: 'Unverified',
  deleted_fictional: 'Removed',
};

/**
 * Quick integrity check for admin dashboard.
 */
export function integrityCheck(fights, events, fighters) {
  const { quarantined, needsReview } = categorizeFights(fights, events, fighters);
  const issues = [];

  for (const q of quarantined) {
    issues.push({
      fight: `${q.fight.fighter_a_name} vs ${q.fight.fighter_b_name}`,
      eventId: q.fight.event_id,
      eventName: q.event?.name || 'unknown',
      status: q.fight.status,
      reason: q.verification.issues.join('; '),
      tier: q.verification.tier,
    });
  }

  for (const r of needsReview) {
    issues.push({
      fight: `${r.fight.fighter_a_name} vs ${r.fight.fighter_b_name}`,
      eventId: r.fight.event_id,
      eventName: r.event?.name || 'unknown',
      status: r.fight.status,
      reason: r.verification.issues.join('; '),
      tier: r.verification.tier,
    });
  }

  // Check for duplicate matchup conflicts
  const matchupKeys = {};
  for (const fight of fights) {
    const key = [fight.fighter_a_name, fight.fighter_b_name].sort().join('|||');
    if (!matchupKeys[key]) matchupKeys[key] = [];
    matchupKeys[key].push(fight);
  }
  for (const [key, group] of Object.entries(matchupKeys)) {
    if (group.length > 1) {
      const hasCompleted = group.some(f => f.status === 'completed');
      const hasScheduled = group.some(f => f.status === 'scheduled');
      if (hasCompleted && hasScheduled) {
        issues.push({
          fight: `${group[0].fighter_a_name} vs ${group[0].fighter_b_name}`,
          eventId: null,
          eventName: null,
          status: 'DUPLICATE',
          reason: 'Fight exists as both completed and scheduled — conflict',
          tier: DISPLAY_TIER.ADMIN_REVIEW,
        });
      }
    }
  }

  return issues;
}

// ─── EVENT VERIFICATION HELPER ───────────────────────────────────────────────

/**
 * Verify an event against its fights.
 * Used by EventDetail page to display verification status per fight.
 */
export function verifyEventFights(event, fights, fighters) {
  return verifyEvent(event, fights, fighters);
}