# Forge AI feature review — 22 November 2026

Scope: the local Ask AI feature, its authenticated gateway, request limits and response handling. Findings are ordered by severity; all three are fixed.

1. **High — delayed request could bypass the per-user quota.** The gateway captured the rate window before awaiting the request body. Other requests could consume the allowance while the body was pending, then the delayed request could replace the window. The gateway now re-reads and reserves the current allowance after reading the body, without an intervening await. A regression test holds one body open while ten requests consume the quota and verifies the delayed request receives HTTP 429. This test failed before the fix.
2. **Medium — chunk boundaries could corrupt Unicode questions.** Converting each incoming buffer to text separately could split a multi-byte character. The gateway now enforces the byte limit while collecting buffers and decodes the combined buffer once. A regression test splits a boxing emoji across chunks and verifies the model receives the original question. This test failed before the fix.
3. **Medium — invalid successful responses could produce an empty answer.** The client previously accepted malformed HTTP 200 data as a successful answer. The shared response reader now rejects invalid JSON, missing or empty answers, and incomplete response metadata with a useful error. Tests cover malformed responses, HTTP errors and valid answers.

## Verification

- All 11 automated tests pass, including both reproduced regressions.
- ESLint and the production build pass. The build still reports the existing large-bundle warning.
- The Supabase backend diagnostic save/read check passes.
- A real local-model inference passes and the gateway rejects an unsigned request with HTTP 401.
- Browser verification exposed a separate onboarding transition bug: the old step remained interactive while its exit animation waited, allowing the step counter to advance beyond five. Step content now changes immediately without waiting for an exit animation. The profile was completed in the browser with optional preferences left empty.
- The Supabase security advisor reports no RLS findings. It reports one existing warning: leaked-password protection is disabled. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No plan upgrade or authentication policy change was made.
- The model remains local behind a loopback gateway; Supabase validates the session before inference. Local model files, runtime credentials and environment files remain excluded from Git.
- The signed-in browser flow returned real Qwen3 answers. The captured example is in `evidence/forge-ai-feature.jpg`. Another answer incorrectly called a judges' decision a knockout rule; model accuracy remains a limitation, consistent with the visible warning. Generated explanations must not be treated as verified sports records.

## Assignment adaptation

This feature uses Qwen3 through llama.cpp instead of Gemini because the selected local setup avoids the age-restricted Gemini developer service and AI usage fees. The form must explain the substitution and must not claim Gemini integration. Sentry is optional in the slides and has not been connected. A working-feature screenshot and Google Forms submission are separate completion steps.
