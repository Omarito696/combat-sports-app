/**
 * Stale Data Cleanup
 * 
 * Automatically marks events and fights as completed if their date has passed.
 * Call runDailyCleanup() on app load or from a scheduled task.
 */

import { base44 } from '@/api/base44Client';

/**
 * Mark all events with a past date as 'completed' (unless already completed/cancelled).
 * Also marks their associated fights as 'completed' if still 'scheduled'.
 * Returns { eventsFixed, fightsFixed, warnings }
 */
export async function runDailyCleanup() {
  const now = new Date();
  // Use midnight of today — an event dated today is still considered upcoming
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const warnings = [];
  let eventsFixed = 0;
  let fightsFixed = 0;

  try {
    // Fetch all non-completed events
    const events = await base44.entities.Event.list('-date', 500);
    const staleEvents = events.filter(e => {
      if (!e.date) return false;
      if (e.status === 'completed' || e.status === 'cancelled') return false;
      return new Date(e.date) < cutoff;
    });

    // Update stale events in parallel
    await Promise.all(staleEvents.map(async (event) => {
      await base44.entities.Event.update(event.id, { status: 'completed' });
      eventsFixed++;
    }));

    // If any events were fixed, also fix their fights
    if (staleEvents.length > 0) {
      const staleEventIds = new Set(staleEvents.map(e => e.id));
      const fights = await base44.entities.Fight.list('order', 1000);
      const staleEventFights = fights.filter(f =>
        staleEventIds.has(f.event_id) && f.status === 'scheduled'
      );
      await Promise.all(staleEventFights.map(async (fight) => {
        await base44.entities.Fight.update(fight.id, { status: 'completed' });
        fightsFixed++;
      }));
    }

    // Also fix fights with no event but a direct date field (if applicable)
    // Warn about fights with missing/null dates
    const allFights = await base44.entities.Fight.list('order', 1000);
    const allEvents = await base44.entities.Event.list('-date', 500);
    const eventMap = Object.fromEntries(allEvents.map(e => [e.id, e]));

    for (const fight of allFights) {
      const event = eventMap[fight.event_id];
      if (!event?.date && fight.status === 'scheduled') {
        warnings.push(`Fight "${fight.fighter_a_name} vs ${fight.fighter_b_name}" has no event date — kept as scheduled`);
      }
    }

  } catch (err) {
    warnings.push(`Cleanup error: ${err?.message || 'unknown'}`);
  }

  return { eventsFixed, fightsFixed, warnings };
}

/**
 * Returns only truly upcoming fights (event date >= today, status != completed/cancelled).
 * Fights with missing event dates are excluded.
 */
export function filterTrulyUpcomingFights(fights, events) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventMap = Object.fromEntries(events.map(e => [e.id, e]));

  return fights.filter(f => {
    if (f.status === 'completed' || f.status === 'cancelled') return false;
    const event = eventMap[f.event_id];
    if (!event?.date) return false; // No date = exclude from upcoming
    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) return false; // Invalid date = exclude
    return eventDate >= today;
  });
}