# FightTracker local setup

The slideshow's AI step uses a local llama.cpp runtime and Qwen3-4B instead of Gemini. The existing Supabase database and email/password sign-up remain connected. No paid AI account, subscription or credit card is used.

## Start

From this project folder, run:

```sh
npm run dev:full
```

Open http://127.0.0.1:5180, sign in, finish onboarding, then choose **Ask AI**. Keep the terminal open. Ctrl+C stops all three services. Port 5173 is left available for your other project.

The runtime and model are already installed in `.local-ai/`. On a fresh Apple Silicon checkout, run `npm ci` then `npm run setup:ai` once before starting. Downloads are pinned and SHA-256 verified. The model download is about 2.5 GB. Everything in `.local-ai/` stays outside Git, and the web server denies access to it.

CPU mode is the tested default. `FIGHTTRACKER_GPU=1 npm run dev:full` enables Metal on Macs where GPU access is available. The runtime needs enough free memory for the model, context and other apps. This setup is for a local prototype: a static website deployment alone cannot run the model on your Mac.

## Accounts and confirmation

Create your FightTracker account at http://127.0.0.1:5180/register using your own email and password. Supabase manages passwords and sessions; the app does not store plaintext passwords. Email confirmation is enabled. Google OAuth is disabled on the project, so its inactive buttons are hidden. It can be enabled separately later with provider credentials and `VITE_GOOGLE_AUTH_ENABLED=true`.

Supabase Auth → URL Configuration must include `http://127.0.0.1:5180` and `http://127.0.0.1:5180/reset-password` for confirmation and password-recovery links. The user's email confirmation and signed-in browser check require the user to complete their account setup.

## AI and access controls

- Browser → same-origin `/api/ai/ask` → local Node server → local llama.cpp API.
- Node verifies each Supabase access token using `auth.getUser(token)` before inference. No service-role key is used.
- Each verified user can ask up to 10 questions per minute, with one in progress at a time. The in-memory limit resets when the server restarts. This is a single-process local prototype, not a distributed production quota.
- Questions are capped at 2,000 characters; output is capped at 384 tokens; generation has a 60-second timeout.
- All services bind to `127.0.0.1`. The raw model API is protected by a randomly generated local key in `.local-ai/runtime-key` with owner-only file permissions. No AI key goes into browser code.
- The assistant has no web-search or database-write tools. Answers are labelled AI explanations and are not saved as real sports facts. Legacy automated AI news/statistics imports stay disabled.
- Personal tables retain owner-scoped RLS. Public sports tables allow reads, while writes require a server-controlled admin role. All 16 public tables have RLS enabled.

## Checks

```sh
npm test
npm run test:connection
npm run test:backend
npm run test:ai       # while dev:full is running
npm run lint
npm run build
npm run build:simulation
```

`test:backend` writes and reads back the fixed diagnostic row in `backend_check`, separate from sports/user data. `test:ai` performs real local inference and checks unauthenticated access is rejected. Unit tests cover forged sessions, per-user quotas, quota reset, request limits, foreign origins/hosts, concurrent requests and inference failures.

The final production artifact must be built with `npm run build`, because both build commands write to `dist/`. Existing project-wide typecheck errors and inherited dependency audit findings are outside this AI setup.

## Age, cost and licences checked November 13, 2026

- llama.cpp is [MIT-licensed](https://github.com/ggml-org/llama.cpp/blob/master/LICENSE), and the selected [official Qwen3 model](https://huggingface.co/Qwen/Qwen3-4B-GGUF) is Apache-2.0 licensed. These licences have no minimum-age clause. Local inference does not need an AI provider account. This does not make model output a child-safety filter.
- [Ollama's current service terms](https://ollama.com/terms) state 18+, so this setup uses llama.cpp directly.
- The connected Supabase organization, Forge AI, was confirmed on the **Free** plan. Its [pricing](https://supabase.com/pricing) includes 500 MB database storage and 50,000 monthly active users; free projects may pause after a week of inactivity. No plan upgrade was made.
- Supabase's [privacy policy](https://supabase.com/privacy) excludes under-13s. Its [terms](https://supabase.com/terms) require authority to enter the agreement; this is not a guarantee of independent contractual eligibility for every minor in every country. No new Supabase provider account was created.
- [GitHub terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) require at least 13, with higher local minimums where applicable. This setup uses the existing repository/account.

The Google Form is intentionally untouched.
