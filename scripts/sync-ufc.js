import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { fightOutcome } from '../src/lib/fightOutcome.js';

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env };
const publish = process.argv.includes('--publish');
const refresh = process.argv.includes('--refresh');
const statsOnly = process.argv.includes('--stats');
const profilesOnly = process.argv.includes('--profiles');
const source = 'sports_db';
const origin = 'https://www.ufcalendar.com';
let providerCalls = 0;

function idFor(type, id) {
  if (id == null) throw new Error('Provider record is missing its ID.');
  const hash = createHash('sha256').update(`ufcalendar:${type}:${id}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function get(path) {
  providerCalls += 1;
  const response = await fetch(`https://api.ufcalendar.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${env.UFCALENDAR_API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const retry = response.headers.get('retry-after');
    throw new Error(`UFCalendar HTTP ${response.status}${retry ? ` (retry after ${retry})` : ''}.`);
  }
  const payload = await response.json();
  if (payload.data == null) throw new Error('UFCalendar returned no data.');
  return payload.data;
}

function fighterRow(fighter, division, profile) {
  const record = profile?.records?.pro_mma;
  const cm = inches => typeof inches === 'number' && inches > 0 ? Math.round(inches * 254) / 100 : null;
  return {
    id: idFor('fighter', fighter.id), name: fighter.name, discipline: 'MMA', organization: 'UFC',
    nickname: fighter.nickname, nationality: fighter.nationality, country_code: fighter.country_code,
    ...(division ? { weight_class: division } : {}),
    ...(profile ? {
      height_cm: cm(profile.height_inches), reach_cm: cm(profile.reach_inches),
      profile_weight_lbs: profile.weight_lbs > 0 ? profile.weight_lbs : null,
      date_of_birth: profile.dob, stance: profile.stance,
    } : {}),
    ...(Number.isFinite(record?.wins) ? {
      wins: record.wins, losses: record.losses, draws: record.draws,
      no_contests: record.no_contests, record_source_type: source,
      record_source_url: `${origin}/fighters/${fighter.slug}`,
      record_confidence: 'medium', record_last_verified_at: new Date().toISOString(),
    } : {}),
  };
}

export function fightRow(bout, eventId, url) {
  const { fighter_a: a, fighter_b: b, result } = bout;
  const method = bout.status === 'no_contest' ? 'No contest' : result?.method ?? null;
  const reportedWinner = [a, b].find(fighter => fighter.id === result?.winner_fighter_id);
  const winner = fightOutcome({ status: 'completed', method, winner_name: reportedWinner?.name,
    fighter_a_name: a.name, fighter_b_name: b.name })?.corner ? reportedWinner : null;
  const hasResult = Boolean(result) || bout.status === 'no_contest';
  const status = ({ announced: 'scheduled', upcoming: 'scheduled', scheduled: 'scheduled', live: 'live', completed: 'completed',
    no_contest: 'completed', cancelled: 'cancelled', canceled: 'cancelled' })[bout.status];
  if (!status) throw new Error(`Unsupported UFCalendar bout status: ${bout.status}.`);
  return {
    id: idFor('fight', bout.id), event_id: eventId, discipline: 'MMA',
    fighter_a_id: idFor('fighter', a.id), fighter_b_id: idFor('fighter', b.id),
    fighter_a_name: a.name, fighter_b_name: b.name, weight_class: bout.weight_class,
    is_main_event: bout.is_main, is_title_fight: bout.is_title, order: bout.ordering,
    card_section: bout.card_section ?? null,
    rounds: bout.scheduled_rounds, status,
    winner_id: winner ? idFor('fighter', winner.id) : null, winner_name: winner?.name ?? null,
    method,
    finish_round: result?.round ?? null, finish_time: result?.time ?? null,
    result_source_url: hasResult ? url : null, result_source_type: hasResult ? source : null,
    result_confidence: hasResult ? 'medium' : 'low', card_source_url: url, card_source_type: source,
  };
}

export function resultTickerRows(fights) {
  return fights.filter(fight => fight.status === 'completed' && fight.method).map(fight => ({
    id: idFor('result', fight.id), fight_id: fight.id, type: 'fight_end',
    round: fight.finish_round, time: fight.finish_time, fighter_name: fight.winner_name,
    description: fightOutcome(fight)?.corner && fight.winner_name
      ? `${fight.winner_name} wins by ${fight.method}.` : `Result: ${fight.method}.`,
  }));
}

export function removedBoutIds(existing, fights) {
  const received = new Set(fights.map(fight => fight.id));
  return existing.filter(fight => ['scheduled', 'live'].includes(fight.status) && !received.has(fight.id))
    .map(fight => fight.id);
}

async function writer() {
  if (!publish) return null;
  if (env.FIGHT_CATALOG_SERVER_KEY) {
    return createClient(env.VITE_SUPABASE_URL, env.FIGHT_CATALOG_SERVER_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  const token = env.FIGHT_CATALOG_ADMIN_TOKEN;
  if (!token) throw new Error('Publishing requires a catalog server key or an existing catalog admin session.');
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || data.user?.app_metadata?.role !== 'admin') throw new Error('A valid catalog admin session is required to publish.');
  return client;
}

async function checked(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

async function upsert(client, table, rows) {
  if (rows.length) await checked(client.from(table).upsert(rows, { defaultToNull: false }));
}

const cornerFields = [
  'corner', 'knockdowns', 'sig_strikes_landed', 'sig_strikes_attempted',
  'total_strikes_landed', 'total_strikes_attempted', 'takedowns_landed', 'takedowns_attempted',
  'submission_attempts', 'reversals', 'control_time_sec',
  ...['head', 'body', 'leg', 'distance', 'clinch', 'ground'].flatMap(area => [`${area}_landed`, `${area}_attempted`]),
];

const pick = (row, fields) => Object.fromEntries(fields.map(field => [field, row[field]]));

async function readStats(boutId, includeJudges) {
  const path = `fights/${boutId}`;
  const totals = await get(`${path}/stats`);
  const rounds = await get(`${path}/rounds`);
  const scores = includeJudges ? await get(`${path}/scorecards`) : null;
  if (!Array.isArray(totals) || !Array.isArray(rounds) || (scores && !Array.isArray(scores.cards))) {
    throw new Error('UFCalendar returned unexpected fight statistics.');
  }
  return {
    totals: totals.map(row => pick(row, cornerFields)),
    rounds: rounds.map(row => pick(row, [...cornerFields, 'round_number'])),
    scorecards: (scores?.cards ?? []).map(card => ({
      ...pick(card, ['judge_id', 'judge_name', 'total_a', 'total_b', 'scores_known']),
      rounds: (card.rounds ?? []).map(round => pick(round, ['round', 'a', 'b'])),
    })),
    scorecard_source: scores?.source ?? null,
    fetched_at: new Date().toISOString(),
  };
}

async function syncStats(client, ids) {
  if (ids.length < 1 || ids.length > 2 || ids.some(id => !/^\d+$/.test(id))) {
    throw new Error('Pass one or two UFCalendar bout IDs after --stats.');
  }
  for (const boutId of new Set(ids)) {
    const id = idFor('fight', boutId);
    const fight = client ? await checked(client.from('fight')
      .select('method,status').eq('id', id).maybeSingle()) : null;
    if (client && fight?.status !== 'completed') throw new Error(`Import completed bout ${boutId} before its statistics.`);
    const statistics = await readStats(boutId, !client || /decision/i.test(fight.method ?? ''));
    if (client) await checked(client.from('fight').update({ statistics }).eq('id', id).select('id').single());
    console.log(`${client ? 'Synced' : 'Verified'} bout ${boutId}: ${statistics.totals.length} totals, ${statistics.rounds.length} round rows, ${statistics.scorecards.length} judges.`);
  }
  console.log(`UFCalendar calls: ${providerCalls}.`);
}

async function syncProfiles(client, ids) {
  if (!ids.length || ids.length > 6 || ids.some(id => !/^\d+$/.test(id))) {
    throw new Error('Pass one to six UFCalendar fighter IDs after --profiles.');
  }
  for (const providerId of new Set(ids)) {
    const id = idFor('fighter', providerId);
    if (client) {
      const existing = await checked(client.from('fighter').select('id').eq('id', id)
        .eq('organization', 'UFC').maybeSingle());
      if (!existing) throw new Error(`Import UFC fighter ${providerId} on a card before refreshing their profile.`);
    }
    const profile = await get(`fighters/${providerId}`);
    if (String(profile.id) !== providerId) throw new Error('UFCalendar returned a different fighter ID.');
    const row = fighterRow(profile, null, profile);
    const details = Object.fromEntries(Object.entries(row).filter(([field, value]) => field !== 'id' && value != null));
    if (client) await checked(client.from('fighter').update(details).eq('id', id).select('id').single());
    console.log(`${client ? 'Synced' : 'Verified'} fighter ${providerId}: ${profile.name}.`);
  }
  console.log(`UFCalendar calls: ${providerCalls}.`);
}

async function sync() {
  if (!env.UFCALENDAR_API_KEY) throw new Error('UFCALENDAR_API_KEY is missing.');
  const client = await writer();
  const ids = process.argv.slice(2).filter(arg => !['--publish', '--refresh', '--stats', '--profiles'].includes(arg));
  if (statsOnly && profilesOnly) throw new Error('Choose one backfill mode per run.');
  if (statsOnly) return syncStats(client, ids);
  if (profilesOnly) return syncProfiles(client, ids);
  if (ids.length > 2 || ids.some(id => !/^[a-z0-9-]+$/.test(id))) {
    throw new Error('Pass up to two UFCalendar event slugs, or omit slugs for one upcoming and one completed card.');
  }
  if (!ids.length && refresh) {
    const now = new Date();
    const from = new Date(now.getTime() - 3 * 86_400_000).toISOString().slice(0, 10);
    const events = await get(`events?org=ufc&from=${from}&limit=25`);
    const upcoming = events.filter(event => ['announced', 'scheduled'].includes(event.status));
    const live = events.find(event => event.status === 'live');
    const active = live ?? upcoming[0];
    const completed = events.findLast(event => event.status === 'completed');
    const disrupted = events.filter(event => ['cancelled', 'postponed'].includes(event.status));
    const watched = client && disrupted.length ? await checked(client.from('event').select('id')
      .in('id', disrupted.map(event => idFor('event', event.id))).in('status', ['upcoming', 'live'])) : [];
    const changed = disrupted.find(event => watched.some(row => row.id === idFor('event', event.id)));
    // Keep one call available for recent results, then rotate through more announced cards.
    const laterCards = live ? upcoming : upcoming.slice(1);
    const day = Math.floor(now.getTime() / 86_400_000);
    const secondary = changed ?? completed ?? (laterCards.length ? laterCards[day % laterCards.length] : null);
    ids.push(...[active?.slug, secondary?.slug].filter(Boolean));
  } else if (!ids.length) {
    for (const status of ['upcoming', 'completed']) {
      const events = await get(`events?org=ufc&status=${status}&limit=1`);
      if (events[0]?.slug) ids.push(events[0].slug);
    }
  }
  for (const slug of new Set(ids)) {
    const event = await get(`events/${slug}`);
    if ((typeof event.org === 'object' ? event.org?.slug : event.org) !== 'ufc' || !Array.isArray(event.card)) {
      throw new Error('Expected a UFC event with a full card.');
    }
    const status = ({ announced: 'upcoming', scheduled: 'upcoming', upcoming: 'upcoming',
      live: 'live', completed: 'completed', cancelled: 'cancelled', postponed: 'postponed' })[event.status];
    if (!status) throw new Error(`Unsupported event status: ${event.status}.`);
    const eventId = idFor('event', event.id);
    const url = `${origin}/events/${event.slug}`;
    const fighters = new Map();
    const bouts = event.card.filter(bout => bout.fighter_a && bout.fighter_b);
    for (const bout of bouts) {
      for (const fighter of [bout.fighter_a, bout.fighter_b]) {
        fighters.set(fighter.id, fighterRow(fighter, bout.weight_class));
      }
    }
    // Enrich one listed athlete per card to keep the free-tier refresh bounded.
    const lead = bouts[0]?.fighter_a;
    const profile = lead && !refresh ? await get(`fighters/${encodeURIComponent(lead.slug)}`) : null;
    if (profile) fighters.set(lead.id, fighterRow(lead, bouts[0].weight_class, profile));
    const disrupted = ['cancelled', 'postponed'].includes(status);
    const fights = bouts.map(bout => fightRow(disrupted && !bout.result
      ? { ...bout, status: 'cancelled' } : bout, eventId, url));
    const ticker = resultTickerRows(fights);
    if (client) {
      if (!fights.length && !disrupted) throw new Error('Refusing to publish an empty card.');
      const previous = !event.starts_at ? await checked(client.from('event').select('date')
        .eq('id', eventId).maybeSingle()) : null;
      const date = event.starts_at ?? previous?.date;
      if (!date) throw new Error('UFCalendar event has no known date.');
      await upsert(client, 'fighter', [...fighters.values()].filter(row => !profile || row.id !== idFor('fighter', lead.id)));
      if (profile) await upsert(client, 'fighter', [fighters.get(lead.id)]);
      await upsert(client, 'event', [{
        id: eventId, name: event.title, discipline: 'MMA', organization: 'UFC',
        date, status, venue: event.venue?.name ?? null,
        main_card_at: event.main_card_at ?? null, prelims_at: event.prelims_at ?? null,
        early_prelims_at: event.early_prelims_at ?? null,
        location: [event.venue?.city, event.venue?.country].filter(Boolean).join(', '),
        date_source_url: url, date_source_type: source, card_source_url: url, card_source_type: source,
        event_confidence: 'medium',
      }]);
      await upsert(client, 'fight', fights);
      await upsert(client, 'fight_event', ticker);
      const existing = await checked(client.from('fight').select('id,status').eq('event_id', eventId)
        .like('card_source_url', `${origin}/events/%`));
      const removed = removedBoutIds(existing, fights);
      if (removed.length) await checked(client.from('fight').update({ status: 'cancelled' }).in('id', removed));
    }
    console.log(`${publish ? 'Synced' : 'Verified'} ${slug}: ${fights.length} bouts, ${fighters.size} fighters, ${ticker.length} result entries.`);
  }
  console.log(`UFCalendar calls: ${providerCalls}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  sync().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
