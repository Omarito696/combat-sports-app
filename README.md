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

The former Base44 LLM integration remains unavailable for sports-data generation. The separate **Ask AI** screen now uses an authenticated local llama.cpp service with Qwen3-4B. It explains rules and terminology; it has no browsing tools and never writes generated answers to sports tables. See [LOCAL_SETUP.md](LOCAL_SETUP.md) for startup, testing and licence details. No automatic real sports ingestion or scoring service is installed.

League records currently use owner-only visibility. Cross-account invite joins and public leaderboards need dedicated server APIs before enabling them for real users; the simulation store can exercise local league creation.

## Checks

- `npm test`: simulation persistence and prevention of simulated writes through the real adapter.
- `npm run test:connection`: read-only catalog probes, private profile visibility, and rejected anonymous writes using the browser key.
- `npm run lint`: ESLint.
- `npm run build` and `npm run build:simulation`: production builds for each mode.
- `npm run typecheck`: existing project-wide JavaScript inference/component typing issues remain; this check is not currently clean.

Browser verification completed real-mode sign-in rendering and simulation onboarding/profile persistence after reload. Database role tests verified owner isolation, denied cross-user/catalog writes, protected scores, and rolled back their temporary data. Security advisors reported no findings. Dependency audit reported five inherited findings (four moderate, one high); resolving them requires dependency review/upgrades. Vite also reports a bundle size warning.

GitHub Actions runs installation, isolation tests, and a simulation build on push and pull requests. Production builds must use real-mode configuration, never the simulation build.

## Save and read one backend test row

Run `npm run test:backend` from the project directory. The command loads the URL and publishable key from `.env.local`, saves one diagnostic row, then makes a separate request to read it and verify its unique run ID. Success prints `PASS: saved and read back the same test row.`

The row is visible in Supabase Table Editor → `backend_check`. Rerunning replaces the same row instead of accumulating test records. This intentionally public diagnostic table accepts only ID `1` and the fixed message `Backend connection test`; its timestamps/run IDs are public and must never contain private information. It is separate from all real sports and user records. Its setup SQL is in `supabase/backend-check.sql` and is already applied to the connected project.
