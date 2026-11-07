// This store deliberately has no Supabase imports or network operations.
export const SIMULATION_KEY = 'combat-sports:simulation:v1';
export const simulationUser = { id: 'simulation-user', email: 'demo@example.invalid', full_name: 'Simulation User', role: 'user' };
export function createSimulationEntities(storage, tables) {
  function load() { return JSON.parse(storage.getItem(SIMULATION_KEY) || '{}'); }
  function save(data) { storage.setItem(SIMULATION_KEY, JSON.stringify(data)); }
  return Object.fromEntries(Object.keys(tables).map(name => {
    const filter = async (criteria = {}, sort = 'created_date', limit = 100) => {
      const rows = (load()[name] || []).filter(row => Object.entries(criteria).every(([k,v]) => row[k] === v));
      const descending = sort.startsWith('-'); const field = sort.replace(/^-/, '');
      rows.sort((a,b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * (descending ? -1 : 1));
      return rows.slice(0, limit);
    };
    return [name, {
      list: (sort, limit) => filter({}, sort, limit), filter,
      async create(input) { const data = load(); const row = { ...input, id: crypto.randomUUID(), created_date: new Date().toISOString(), data_origin: 'simulation' }; (data[name] ||= []).push(row); save(data); return row; },
      async update(id, input) { const data = load(); const row = data[name]?.find(r => r.id === id); if (!row) throw new Error('Simulation record not found'); Object.assign(row, input, {id, data_origin:'simulation'}); save(data); return row; },
    }];
  }));
}
