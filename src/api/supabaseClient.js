import { createClient } from '@supabase/supabase-js';

export const dataMode = import.meta.env.VITE_DATA_MODE || 'real';
if (!['real', 'simulation'].includes(dataMode)) throw new Error('Invalid VITE_DATA_MODE');
export const isSimulation = dataMode === 'simulation';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!isSimulation && (!url || !key)) throw new Error('Configure Supabase using .env.example');
if (!isSimulation && !key.startsWith('sb_publishable_')) throw new Error('Use a Supabase publishable key in the browser');
export const supabase = isSimulation ? null : createClient(url, key);
