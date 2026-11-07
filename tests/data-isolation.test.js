import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationEntities, SIMULATION_KEY } from '../src/api/simulationStore.js';
import { createRealEntities, rejectSimulation } from '../src/api/realEntities.js';

test('simulation writes and updates remain in their dedicated local storage namespace', async () => {
  const stored = new Map();
  const storage = { getItem:k => stored.get(k), setItem:(k,v) => stored.set(k,v) };
  const entities = createSimulationEntities(storage, { Fighter:'fighter' });
  const row = await entities.Fighter.create({name:'Demo',data_origin:'real'});
  assert.equal(row.data_origin, 'simulation');
  await entities.Fighter.update(row.id, {name:'Changed',data_origin:'real'});
  assert.equal((await entities.Fighter.list())[0].data_origin, 'simulation');
  assert.deepEqual([...stored.keys()], [SIMULATION_KEY]);
});
test('real adapter rejects simulated records before any network operation', () => {
  const client = {from() { throw new Error('Network called'); }};
  const entities = createRealEntities(client, {Fight:'fight'});
  assert.throws(() => entities.Fight.create({data_origin:'simulation'}), /Simulation data/);
  assert.throws(() => entities.Fight.update('id', {nested:{is_simulated:true}}), /Simulation data/);
  assert.doesNotThrow(() => rejectSimulation({data_origin:'real',name:'Verified import'}));
});
