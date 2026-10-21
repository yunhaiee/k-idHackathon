# Handoff: Kardza (Yunha's integrations session)

Paste the block below into a new Claude Code session opened in `~/dev/k-idHackathon`.

```
You're continuing work on Kardza, our hackathon project at Build for Everyone (Google x k-ID), Commerce &
Marketplaces track, today Wed Oct 21. Submit v1 at 3:00 PM, final by 4:15, hard stop 4:30, judging 4:45
(2-min live demo + 1-min Q&A at our table). Read these files first, in this order:
HANDOFF.md (this), NOTES_FOR_YUNHA.md (partner's demo + server status), PARTNER_GUIDE.md (rules, file
ownership, design), DEMO_CHEATSHEET.local.md (test cards, links; local only).

WHAT KARDZA IS: a trading-card marketplace that adapts to every age and country. Same screens for everyone;
everything a user can see/do comes from ONE function getPolicy(user) (src/lib/policy.ts) built from that
user's REAL k-ID session for their current country. Never check age directly in UI.

STACK: Expo SDK 58 + Expo Router + TypeScript, shipped as a WEB APP (phones open it in Safari). Not Expo Go.
Server code = Expo Router API routes (src/app/api/*+api.ts). Shared state = src/server/db.ts (JSON file
data/db.json locally; Upstash Redis if UPSTASH_* env set). Clients poll /api/state every 1.5s.

MY ROLE (Yunha = integrations): k-ID, Modulate, Claude/Gemini, FastSpring, server rules, hosting, README,
submission. I own src/app/api/*, src/server/*, src/components/kid/*, src/lib/policy.ts, src/lib/api.ts,
src/lib/checkout.ts, .env, deploy files. Oliver (partner, his own Claude) owns ALL UI, copy, seed data and
the demo scenario: src/app/(tabs)/*, listing, settings, demo.tsx, src/components/* (not kid/*),
src/lib/seed.ts, copy.ts, demo.ts, theme.ts. Shared, tell each other first: src/lib/types.ts,
src/app/api/state+api.ts. Don't edit Oliver's files unless I explicitly ask.

DEMO RULES: the demo ALWAYS runs on my laptop: `npx expo start --tunnel --port 8082`, public URL
https://c-yunhaiee-etcpa2-mvifhw22s8xpmnaa.on.expo.app (personas: ?as=maya|leo|anna|devon; side-by-side
/demo). Don't restart the server unless broken: the tunnel URL could change and would need adding to k-ID
(Kai portal → test key → Origins; localhost:8082 and the on.expo.app URL are already there). If the server
isn't running, start it in a terminal (it needs `npx expo login` as yunhaiee, already done) and check the
URL is unchanged. Keep the repo on branch main (GitHub Desktop once switched it to oliver-demo by
accident). Code freeze 3:45.

PARTNER TOOLS (all real, verified):
- k-ID web SDK @k-id/core (vendor/k-id-core-web.tgz, not in git): age gate, consent emails, per-country
  rules, KidSettings, server claim with secret key (/api/kid/claim). All 4 personas have real verified
  sessions: Maya 14 US, Leo 14 DE (guardian-managed by Anna, consent age 16), Anna 42 DE, Devon 25 US.
  Reset demo keeps them as long as persona ages don't change.
- Modulate: /api/voice → velma-2-stt-batch (PII tags, emotion, deepfake) ~2.5s, then Velma Triage
  (velma-2-batch, ~18s) in the background via runTask, appended to the parent alert.
- Claude (claude-opus-5-5, @anthropic-ai/sdk, structured output, fallbacks:"default"): card scan +
  message safety (src/server/ai.ts, AI_ORDER=claude,gemini). Gemini 3.8 Flash is a fallback only (503 today).
- Pokémon TCG API: real TCGplayer market prices for every card, refreshed on Reset with a cache
  (src/server/prices.ts, /api/prices). Demo Charizards: Flashfire 13/106 $71.47, Legendary Treasures
  19/113 $76.24.
- FastSpring (store kardzaa_store, checkout domain yunhakardza.test.onfastspring.com): WORKING end to end.
  Server checks k-ID purchase rules → creates a session with the buyer pre-filled (parent = buyer of
  record) → buyer pays with test card 4242 4242 4242 4242 + the store's test CVV (in .env /
  cheat sheet) → "I finished checkout" → server verifies the completed order via FastSpring API.
  FASTSPRING_CHECKOUT_MODE=session. scripts/fastspring-check.sh prints a masked API log.
  Server secrets are re-read from .env on change (src/server/env.ts) for FastSpring.

SERVER ACTIONS (/api/state POST): reset, setCountry, kidUpdate, kidForget, listScanned, createOffer
(+cashUsd), respondOffer, counterOffer, parentReviewOffer, block, parentDecision, readAlert,
requestPurchase, recordPurchase(+orderId). Offers to a child whose trading a parent manages are created
'needs-parent' (held for the parent). Credibility −5 once per burst of high-risk messages (Devon 62→57).

HOW TO WORK: move fast; don't ask unless truly blocked; tell me in one line what you chose. Keys only in
.env and only read in API routes/server code (EXPO_PUBLIC_ only for the k-ID publishable key + fapi URL).
Never commit .env, vendor/, data/, *.local.md. Typecheck (npx tsc --noEmit) before committing; commit small
and push to main. Read docs instead of guessing (Expo: docs.expo.dev/versions/v58.0.0, Modulate:
docs.modulate.ai, FastSpring: developer.fastspring.com, k-ID: node_modules/@k-id/core/README.md).
If something fights you, tell me the error plainly and use a clearly LABELED simulated fallback. Explain
things to me in plain words.

STILL OPEN (as of 1:00 PM):
1. Oliver must wire his UI to the new actions (Anna's Approve/Decline → parentReviewOffer; Maya's
   "Counter at $65" + Devon's "Accept" → counterOffer/respondOffer; show card.priceSource instead of
   "Priced by AI"). When he pushes, `git pull` on my laptop (server hot-reloads) and re-test the flow.
2. README.md: what Kardza is, how each partner tool is used, how to run.
3. Draft the submission form text (team, track Commerce & Marketplaces, one-liner, links: repo
   github.com/yunhaiee/k-idHackathon + "live demo at our table" + backup video; tools: k-ID, Modulate,
   FastSpring; Other: Claude (Anthropic), Pokémon TCG API, Expo/React web. Not Inworld, not Google Cloud
   hosting) + judge Q&A answers (see PARTNER_GUIDE.md §13).
4. Rehearse /demo with Oliver ~1:30–2:30 and fix server-side bugs; backup screen recording at 2:30.
5. Optional: FastSpring checkout branding (dashboard; logo in assets/brand/), Velma line in Anna's alert UI
   (Oliver's file), Vercel + Upstash deploy for a laptop-free link.

Start by: `git status` + `git pull`, confirm the dev server responds on localhost:8082 and the tunnel URL,
then tell me in 3 lines where things stand and do item 2 (README).
```
