import assert from 'node:assert/strict';
import test from 'node:test';
import { fightRow, removedBoutIds, resultTickerRows } from '../scripts/sync-ufc.js';

const url = 'https://www.ufcalendar.com/events/example';
const first = { id: 5, status: 'scheduled', fighter_a: { id: 1, name: 'Fighter A' }, fighter_b: { id: 2, name: 'Fighter B' } };
const map = bout => fightRow(bout, 'event-id', url);

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
