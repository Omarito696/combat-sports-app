# FightTracker

React + Vite combat sports app connected to [Omarito696/combat-sports-app](https://github.com/Omarito696/combat-sports-app) and Supabase project `uutpqhebfybvsdajbdwv`.

## Run locally

Use Node.js 22 or later, then `npm ci`.

Real mode: copy `.env.example` to `.env.local`, supply the project's URL and **publishable** key, and run `npm run dev`. The existing local checkout is already configured. Sign in or register with Supabase Auth. No privileged database credentials belong in Vite environment variables. `.env.local` is ignored by Git.

Simulation: run `npm run dev:simulation` in another terminal. This starts a separate origin (port 5174 by default) with a persistent SIMULATION banner and a local demo identity. Complete onboarding to try profile persistence. It starts with an empty sports catalog. All simulation records stay in browser localStorage under `combat-sports:simulation:v1`. To reset the sandbox, remove that key using browser developer tools. Simulation mode creates no Supabase client and never falls back to the real backend.

If a port is occupied, Vite prints the alternative URL. Do not run both modes on the same origin.

## Database and authentication

`supabase/schema.sql` is the schema snapshot for a fresh project; it was applied to the connected project using Supabase migrations. Do not reapply it to an initialized database. Future changes should use reviewed migrations.

There are 15 entity tables. All have RLS enabled. Catalog reads are public; writes require a server-managed `app_metadata.role = admin` claim. Personal profiles, predictions, lineups, league memberships and leagues are owner-scoped. Score/resolution columns cannot be written by the browser. Backend scoring requires trusted server credentials. No simulated records were seeded into Supabase; the real catalog is intentionally empty until verified sports data is imported.

The real client rejects simulation provenance, and database constraints only accept `data_origin = real`. Provenance labels cannot establish factual accuracy: administrators must still verify source data before importing it. Random fallback ratings, AI live commentary generation, and date-based automatic completion writes have been removed. Fighters without stored ratings are unavailable in the lineup picker.

Email/password, email confirmation, Google OAuth, and password recovery use Supabase Auth. Configure Google provider credentials separately if Google login is needed. In Supabase Auth URL Configuration, allow each local URL used (for example `http://localhost:5173`, `http://127.0.0.1:5173`, and their `/reset-password` paths) plus deployed URLs. Confirmation emails may contain links rather than codes, depending on the project template. Complete real email confirmation/OAuth flows with your own account; no test accounts are created by this setup.

The former Base44 LLM integration is deliberately unavailable. AI/news generation requires a separately implemented trusted service; the app never substitutes generated content for live sports facts. No automatic real sports ingestion or scoring service is installed.

League records currently use owner-only visibility. Cross-account invite joins and public leaderboards need dedicated server APIs before enabling them for real users; the simulation store can exercise local league creation.

## UFC catalog sync

`node scripts/sync-ufc.js` checks one upcoming and one completed UFC card using the server-side `UFCALENDAR_API_KEY` in `.env.local`. Pass one or two UFCalendar event slugs to check specific cards. A default run uses six requests and does not write to the database.

Add `--publish` only when you intend to expose the selected data through the public catalog. Set `FIGHT_CATALOG_ADMIN_TOKEN` to a current access token for an existing app catalog admin. The run writes event, bout, and fighter records and adds confirmed result entries to the fight ticker. A refresh of the same card updates the same records. The importer enriches one fighter per card and does not generate in-round commentary.

Use `--refresh` to check the current or next card and the latest completed card in the past three days. When there is no recent result to refresh, the second slot rotates through later announced cards. It uses at most three UFCalendar requests per run and skips profile lookups. The GitHub Actions UFC catalog workflow runs this mode daily after the workflow is on the default branch and the repository has the `VITE_SUPABASE_URL` variable plus `UFCALENDAR_API_KEY` and `FIGHT_CATALOG_SERVER_KEY` secrets. Use a Supabase server key for the latter. Keep both keys out of frontend configuration. Reserve free-tier requests for manual backfills and avoid repeated workflow dispatches.

For detailed statistics, run `node scripts/sync-ufc.js --stats <UFCalendar bout ID> --publish` after importing the completed bout. Pass up to two IDs. Publishing uses two calls for a finish and three for a decision. The daily card refresh preserves previously published stats and does not spend quota on the stats backfill.

The UFC ticker reads automated confirmed results. During the event window or while a bout is live, it checks the app database every five seconds. These checks use no UFCalendar requests.

To check confirmed results sooner on fight night, run the UFC catalog refresh workflow with the UFCalendar event slug. The targeted run uses one provider request.

The workflow also accepts space-separated `bout_ids` for up to two completed bouts or `fighter_ids` for up to six fighters already in the UFC catalog. Profile refreshes use one request per fighter and preserve existing values where the source omits a field. Leave the other inputs blank.

## Checks

- `npm test`: simulation persistence and prevention of simulated writes through the real adapter.
- `npm run test:connection`: read-only catalog probes, private profile visibility, and rejected anonymous writes using the browser key.
- `npm run lint`: ESLint.
- `npm run build` and `npm run build:simulation`: production builds for each mode.
- `npm run typecheck`: existing project-wide JavaScript inference/component typing issues remain; this check is not currently clean.

Browser verification completed real-mode sign-in rendering and simulation onboarding/profile persistence after reload. Database role tests verified owner isolation, denied cross-user/catalog writes, protected scores, and rolled back their temporary data. Security advisors reported no findings. Dependency audit reported five inherited findings (four moderate, one high); resolving them requires dependency review/upgrades. Vite also reports a bundle size warning.

GitHub Actions runs installation, isolation tests, and a simulation build on push and pull requests. Production builds must use real-mode configuration, never the simulation build.
