export function rejectSimulation(value) {
  if (!value || typeof value !== 'object') return;
  if (value.data_origin && value.data_origin !== 'real' || value.is_simulated || value.is_simulation) throw new Error('Simulation data cannot be written to real tables');
  Object.values(value).forEach(rejectSimulation);
}
export function createRealEntities(client, tables) {
  const unwrap = async query => { const { data, error } = await query; if (error) throw error; return data; };
  return Object.fromEntries(Object.entries(tables).map(([name, table]) => {
    const filter = (criteria = {}, sort = 'created_date', limit = 100) => {
      let query = client.from(table).select('*');
      for (const [key, value] of Object.entries(criteria)) query = value === null ? query.is(key, null) : query.eq(key, value);
      return unwrap(query.order(sort.replace(/^-/, ''), { ascending: !sort.startsWith('-') }).limit(limit));
    };
    return [name, {
      list: (sort, limit) => filter({}, sort, limit), filter,
      create(input) { rejectSimulation(input); return unwrap(client.from(table).insert(input).select().single()); },
      update(id, input) { rejectSimulation(input); return unwrap(client.from(table).update(input).eq('id', id).select().single()); },
    }];
  }));
}
