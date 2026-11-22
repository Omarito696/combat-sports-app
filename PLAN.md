# Forge AI Club — main feature plan

FightTracker helps combat-sports fans understand the sport and follow fighters. The smallest AI feature is **Ask AI**: a signed-in user asks about rules, scoring or terminology and receives a clearly labelled explanation.

1. Keep the existing Supabase sign-up, login and owner-only database policies.
2. Use the existing Ask AI page and a server-side local Qwen3 model through llama.cpp. Gemini is replaced because of the under-18 developer-access restriction identified during setup. Do not claim this project uses Gemini.
3. Check sign-in on the server, limit each user to ten questions a minute, and keep the local runtime key out of browser files and GitHub.
4. Show a useful error for invalid questions, an unavailable model or an invalid server response. Never save generated answers as verified fight results, statistics or news.
5. Review the implementation, fix the top three issues, and add regression tests for those fixes.
6. Run automated checks, start the app, test a real signed-in question, capture its working screen, and push the work to the existing GitHub branch.
7. Fill the club progress forms truthfully. Explain the local model substitution, leave the Gemini checkbox unchecked, and skip optional Sentry.
