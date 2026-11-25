import assert from 'node:assert/strict';
import test from 'node:test';
import { detailRequestBudget, fightRow, removedBoutIds, resultTickerRows } from '../scripts/sync-ufc.js';
import { DISPLAY_TIER, verifyUpcomingFight } from '../src/lib/verification.js';

const url = 'https://www.ufcalendar.com/events/example';
const first = { id: 5, status: 'scheduled', fighter_a: { id: 1, name: 'Fighter A' }, fighter_b: { id: 2, name: 'Fighter B' } };
const map = bout => fightRow(bout, 'event-id', url);

test('scheduled refresh reserves one request per remaining UTC day', () => {
  const now = new Date('2026-11-25T11:25:00Z');
  assert.equal(detailRequestBudget(5, now), 0);
  assert.equal(detailRequestBudget(6, now), 1);
  assert.equal(detailRequestBudget(9, now), 2);
  assert.equal(detailRequestBudget(2, new Date('2026-11-30T23:59:00Z')), 2);
});

test('a completed bout on a different UFC card does not hide a rematch', () => {
  const scheduled = map(first);
  const past = fightRow({ ...first, id: 6, status: 'completed' }, 'older-card', url);
  const event = { date: '2099-01-01T12:00:00Z', status: 'upcoming', date_source_url: url };
  const fighters = [first.fighter_a, first.fighter_b];
  assert.equal(verifyUpcomingFight(scheduled, event, fighters, [scheduled, past]).tier, DISPLAY_TIER.VERIFIED_UPCOMING);
});

test('a replacement on the same provider bout updates the existing row and the linked opponent', () => {
  const original = map(first);
  const replacement = map({ ...first, fighter_b: { id: 3, name: 'New opponent' } });
  assert.equal(replacement.id, original.id);
  assert.notEqual(replacement.fighter_b_id, original.fighter_b_id);
  assert.equal(replacement.fighter_b_name, 'New opponent');
  assert.deepEqual(removedBoutIds([original], [replacement]), []);
});

test('assigning the replacement a new provider ID retires the old bout and preserves completed bouts', () => {
  const original = map(first);
  const replacement = map({ ...first, id: 6, fighter_b: { id: 3, name: 'New opponent' } });
  const completed = map({ ...first, id: 7, status: 'completed' });
  assert.deepEqual(removedBoutIds([original, completed], [replacement]), [original.id]);
});

test('a corrected result replaces its ticker entry and clears the winner on a no contest', () => {
  const original = map({ ...first, status: 'completed', result: { winner_fighter_id: 1, method: 'KO/TKO', round: 1 } });
  const corrected = map({ ...first, status: 'no_contest' });
  const [originalUpdate] = resultTickerRows([original]);
  const [correctedUpdate] = resultTickerRows([corrected]);
  assert.equal(correctedUpdate.id, originalUpdate.id);
  assert.equal(corrected.winner_id, null);
  assert.equal(corrected.finish_round, null);
  assert.equal(corrected.result_source_url, url);
  assert.equal(correctedUpdate.description, 'Result: No contest.');
});
