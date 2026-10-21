# Kardza: status and task split (updated 11:50)

> **Ownership (11:50):** the partner + his Claude own all UI, copy, seed data and the demo scenario (see PARTNER_GUIDE.md). Yunha + her Claude own k-ID, Modulate, AI, FastSpring, server, hosting, README and submission. UI items in the modules below belong to the partner.

Live app (laptop must be running `npx expo start --tunnel --port 8082`):
`https://c-yunhaiee-etcpa2-mvikkimlmui507tx.on.expo.app` · personas: add `?as=maya` / `?as=jordan` / `?as=mom`

## Done and verified

| Area | What works | Partner tool |
|---|---|---|
| Shell | Web app (phone Safari size), persona switcher, country picker (US/DE/GB/KR), Reset, "Rules from k-ID" banner + rules sheet on every screen | — |
| k-ID | Real web SDK age gate; declare (7 permissions); session/challenge saved per persona+country; server claim with secret key (returns PASS); `KidSettings` toggles sync to our server; German/Korean widget locale; `getPolicy` reads k-ID permissions + consent/civil age | k-ID |
| Scan | Photo or sample card → Claude Opus 5.5 vision → name, set, price, fake-risk; price shown 3 ways by age; "List it" | Claude (Gemini fallback, currently 503) |
| Trades | Offers from binder, fair-trade meter worded per age, kid accept → parent approval, cards move on approval | — |
| Voice safety | Modulate STT with PII tags (phone hidden), emotion, deepfake score; Velma Triage in background ("Child Safety Violation 95%") | Modulate |
| Text safety | Rules + Claude second opinion | Claude |
| Parent | Family tab: approvals + safety alerts with reason only, never the chat | — |
| Shop | Server-side k-ID purchase gate (kid asks parent, teen ≤ $5, Pro+ adults only), parent approve-and-pay | FastSpring (simulated until API works) |
| Infra | Expo tunnel (public https), store ready for Upstash Redis, Vercel config (not deployed) | — |

Not verified yet: Maya's live parental-consent email loop · Jordan in Germany · scan/shop click-through on a real phone · live voice recording in iPhone Safari.

## Blockers (Yunha, no code)

- [ ] Kai → Origins: add `https://c-yunhaiee-etcpa2-mvikkimlmui507tx.on.expo.app`
- [ ] FastSpring: Discord message to Adam (API 401). Create products `holo-binder-theme` 2.99, `digital-slab` 4.99, `safe-trade-protection` 1.99, `collector-pro` 7.99/mo. Paste the Test Product Page URL into `.env` as `FASTSPRING_TEST_PRODUCT_BASE`
- [ ] Pick the inboxes: Mom (Maya's parent) and Jordan's guardian (e.g. Oliver's email)

## Demo dependencies (real k-ID rules we found)

- **Jordan (15, US): k-ID makes trading guardian-managed.** Before the demo: Jordan → Settings → ask for "Virtual Property Ownership" → his guardian approves the k-ID email. He must also switch on Messages + Voice himself (player-managed).
- **Maya (11): her parent sets her permissions in k-ID's consent email.** Mom must allow trading + chat when approving, or Maya can't trade.

## Modules (one owner each; each touches its own files)

| # | Module | Files | Tasks | Est. | Owner |
|---|---|---|---|---|---|
| M1 | k-ID flows | `src/components/kid/*`, `src/lib/policy.ts` | Run Maya live consent end to end; Jordan guardian upgrade; Jordan US → DE flip; check banner reasons read well; (P2) `KidSessionVerifyAge` for Pro+ | 45m | |
| M2 | Trades + Modulate | `src/components/trade/*`, `api/message`, `api/voice`, `server/safety.ts`, `server/modulate.ts` | Live voice recording in iPhone Safari; Scenario B (Jordan offers on Mom's Charizard → Mom sees full transcript + scam badge); loading/empty states | 45m | |
| M3 | Shop + FastSpring | `(tabs)/shop.tsx`, `api/checkout`, `lib/checkout.ts`, `CheckoutSheet.tsx` | Click through kid ask → Mom pays; plug in real FastSpring URL/API when unblocked; Pro+ adult only | 30m | |
| M4 | Scan | `(tabs)/scan.tsx`, `api/scan`, `server/ai.ts`, `server/gemini.ts` | Phone camera test; 2-3 real card photos as samples; switch to Gemini first if it recovers (`AI_ORDER=gemini,claude`) | 20m | |
| M5 | Deploy + docs | `vercel.json`, `api/index.ts`, `server/db.ts`, `README.md`, new `/privacy` `/terms` pages, `assets/` icon | (optional) Upstash + `vercel deploy` for a laptop-free link; README "how each partner is used"; Kardza icon; privacy/terms pages + add to k-ID declare | 40m | |
| M6 | Demo + submission | none | Script (SCOPE.md §6), rehearse 3x on 3 devices, backup screen recording, fill the form at 3:00 | ongoing | |

Rules for parallel work: one Claude Code session per module, only touch that module's files, pull before you start, commit small. `src/lib/types.ts` and `src/app/api/state+api.ts` are shared: tell the other person before editing them.

## Submission form
- Tools: ☑ k-ID · ☑ Modulate · ☑ FastSpring (say "sandbox checkout" if API stays blocked) · ☐ Inworld · ☐ Google Cloud hosting · ☑ Other: Claude (Anthropic), Expo/React web, Gemini (fallback)
- Timeline: submit v1 at 3:00, final by 4:15
