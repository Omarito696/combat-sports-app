import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { entityTables } from '../src/api/entityTables.js';
const env = loadEnv('development', process.cwd(), 'VITE_');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
for (const [name, table] of Object.entries(entityTables)) {
  if (['UserProfile','FantasyLineup','Prediction','League','LeagueMember'].includes(name)) continue;
  const { error } = await client.from(table).select('id').limit(1);
  if (error) throw error;
  console.log(`PASS public read: ${table}`);
}
const { data, error } = await client.from('user_profile').select('id');
if (!error && data.length) throw new Error('Private profiles were exposed');
const denied = await client.from('fighter').insert({name:'simulation probe', data_origin:'simulation'});
if (!denied.error) throw new Error('Anonymous database write was allowed');
console.log('PASS private profiles hidden and anonymous writes denied');
