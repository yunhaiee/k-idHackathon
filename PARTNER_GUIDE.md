# Kardza: Partner Guide (UI + demo owner)

This guide is for you and your Claude Code. It explains everything you need, so you don't have to read other docs.

**For your Claude Code, paste this first:**
> Read PARTNER_GUIDE.md in full and follow it exactly. I own the app UI and the demo scenario. Do not edit files marked "Integrations team" below.

---

## 1. What we're building

**Kardza is a trading-card marketplace that adapts to every age and country.** Kids trade with a parent in the loop, teens buy within limits, adults trade freely. **k-ID decides the rules**, and AI keeps every trade fair and every message safe.

- Event: Build for Everyone (Google x k-ID), **Commerce & Marketplaces** track.
- Judges score: (1) it genuinely adapts to age **and** location, (2) real use of k-ID and partner tools, (3) it works live, (4) people would use it, (5) ambition.
- Demo: **2 minutes live + 1 minute Q&A**, at our table, from 4:45. Lead with the moment the app changes for a different user.
- Deadlines: submit v1 at **3:00**, final by **4:15** (hard stop 4:30).

## 2. Who owns what

| Owner | Owns | Files |
|---|---|---|
| **You + your Claude** | All screens, UI, copy, layout, the demo scenario, seed data (cards, personas, prices) | `src/app/(tabs)/*`, `src/app/listing/[id].tsx`, `src/app/settings.tsx`, `src/components/ui.tsx`, `src/components/TopBar.tsx`, `src/components/Price.tsx`, `src/components/CheckoutSheet.tsx`, `src/components/trade/*`, `src/lib/theme.ts`, `src/lib/seed.ts` |
| **Integrations team** (Yunha + her Claude) | k-ID, Modulate, Claude/Gemini, FastSpring, server rules, hosting, README, submission | `src/app/api/*`, `src/server/*`, `src/components/kid/*`, `src/lib/policy.ts`, `src/lib/api.ts`, `src/lib/checkout.ts`, `src/lib/simulated.ts`, `.env`, `vercel.json`, `Dockerfile`, `server.js` |
| **Shared: ask in chat before editing** | Data types and state actions | `src/lib/types.ts`, `src/app/api/state+api.ts` |

If the UI needs new data or a new server action, ask the integrations team in chat. Don't edit their files.

**Git rules:** `git pull` before you start; commit small; push after each fix; post a one-line note in chat. **Never commit `.env` or `vendor/`.**

## 2b. Rule: the demo always runs on Yunha's laptop

- **Only Yunha's laptop runs the demo server.** It serves the app and the shared state (offers, messages, alerts, k-ID sessions) through Expo's tunnel: `https://c-yunhaiee-etcpa2-mvifhw22s8xpmnaa.on.expo.app`.
- **Every demo device opens that URL:** Maya's phone, Jordan's phone, and Mom (laptop browser or phone). Nobody demos from their own local server, because its data is separate and the other devices won't see it.
- **Your laptop is for building only** (`http://localhost:8082`). Your changes reach the demo like this: you push, tell Yunha, her Claude pulls, and her running server reloads on its own (same URL, no restart).
- **Don't restart Yunha's server** unless something is broken. A restart can change the tunnel URL, and the new URL would then have to be added to k-ID's allowed origins.
- **Don't edit the demo data by hand.** Use the app's own controls ("···" → Reset demo resets Maya only).
- **Yunha's laptop on demo day:** plugged in, never sleeping, with a phone hotspot as backup Wi-Fi.
- **Code freeze:** last UI push by **3:45**. After that, demo-breaking fixes only, agreed in chat.

## 3. Setup (about 5 minutes)

1. Clone:
   ```bash
   git clone https://github.com/yunhaiee/k-idHackathon.git && cd k-idHackathon
   ```
2. Get **`.env`** from Yunha by AirDrop (never through git) and put it in the repo root.
3. Get **`k-id-core-web.tgz`** (k-ID's pre-release web SDK) from Yunha, make a folder `vendor/` in the repo root, and put it there: `vendor/k-id-core-web.tgz`.
4. Install:
   ```bash
   npm install
   ```
5. Run:
   ```bash
   npx expo start --port 8082
   ```
6. Open three browser tabs, one per persona:
   - `http://localhost:8082/?as=maya`
   - `http://localhost:8082/?as=jordan`
   - `http://localhost:8082/?as=mom`

   Use the browser's phone view (375px wide). That's how judges will see it.

Notes:
- **Port must be 8082.** k-ID only answers allowed origins, and `http://localhost:8082` is on the list. Another port gives "Origin not allowed for this publishable key".
- Your local data (`data/db.json`) is separate from Yunha's. The demo always runs on **Yunha's laptop** (see 2b).
- In your local copy every persona must pass k-ID once. Jordan and Mom pass instantly. Maya needs a parent email; on your laptop you can tap **"k-ID unreachable? Use simulated rules"** to skip it while building UI (it's clearly labeled "Simulated k-ID rules").

## 4. Stack (what it is and isn't)

- **Expo SDK 58 + Expo Router + TypeScript, shipped as a web app.** Phones open it in Safari; "Add to Home Screen" makes it full-screen. **We are not using Expo Go.**
- React Native components (`View`, `Pressable`, `Text` via our `Txt`) render to the web through react-native-web. Write normal RN components, not raw HTML.
- Server code lives in Expo Router API routes (`src/app/api/*+api.ts`) on the same server.
- k-ID's real web SDK (`@k-id/core`) runs in the browser for the age gate and settings.
- Live demo URL (Yunha's laptop through Expo's tunnel): `https://c-yunhaiee-etcpa2-mvifhw22s8xpmnaa.on.expo.app` (add `?as=maya` etc.).

## 5. The one rule: everything adapts through `getPolicy(user)`

**Same screens for everyone. No "kids version".** Every screen asks one function, `getPolicy(user)` (in `src/lib/policy.ts`), what this person may see and do, and renders accordingly. **Never check age directly in UI code.**

`getPolicy` is built from the user's **real k-ID session** for their current country: k-ID's per-permission rules plus the country's digital-consent age and civil (adult) age.

Fields you can use:

| Field | Values | Meaning |
|---|---|---|
| `band` | `'kid' \| 'teen' \| 'adult'` | Under consent age / under civil age / adult (thresholds come from k-ID per country) |
| `access[perm]` | `'on' \| 'optin' \| 'parent' \| 'off'` | on · off but player can switch it on in Settings · a parent decides · not available |
| `priceView` | `'plain' \| 'range' \| 'full'` | kid "About $85" · teen fair range · adult exact + market |
| `chatMode` | `'none' \| 'presets' \| 'filtered' \| 'open'` | how messaging works |
| `voice` | `'none' \| 'hide-on-risk' \| 'redact' \| 'transcript+warning'` | how risky voice notes are shown |
| `canTrade`, `tradeNeedsParent` | boolean | trading allowed; kid trades need parent approval |
| `purchase` | `'off' \| 'parent' \| 'limit' \| 'free'` | shop behaviour; `purchaseLimitUsd` is 5 for teens |
| `canSubscribe` | boolean | Collector Pro+ (adults only) |
| `bigUI` | boolean | kid: bigger buttons, simpler words |
| `consentAge`, `civilAge`, `countryName`, `status`, `source` | | for copy like "Under 16 in Germany, a parent approves" |

k-ID permissions Kardza uses (`perm` names):
`in-game-purchases` (Shop) · `virtual-property-ownership` (trading) · `text-chat-private` (messages) · `voice-chat` (voice notes) · `camera-access` + `ai-media-upload` (Scan) · `custom-username`.

**Make the adaptation obvious on every screen.** The "Rules from k-ID" banner must stay visible on every screen.

## 6. How the app works (file map)

| Screen / piece | File | What it does |
|---|---|---|
| Top bar + k-ID banner | `src/components/TopBar.tsx` | Persona chips (Maya / Jordan / Alex), "···" opens country picker (US/DE/GB/KR) + **Reset demo**. Banner "Rules from k-ID · Jordan, 15 · United States · consent age 13"; tap opens a sheet listing each permission + link to Settings |
| Tabs | `src/app/(tabs)/_layout.tsx` | Market · Scan · Inbox · Shop · Family (Mom) / Me. If the persona hasn't passed k-ID for their country, shows the k-ID gate instead of the tabs |
| Market | `src/app/(tabs)/index.tsx` | Listings + your binder, prices via `Price.tsx` |
| Listing | `src/app/listing/[id].tsx` | Card detail; "Make an offer" picks cards from your binder; `FairMeter` preview; send offer |
| Inbox | `src/app/(tabs)/inbox.tsx` + `src/components/trade/OfferThread.tsx` | Offer threads, accept/decline, messages, composer |
| Message bubble | `src/components/trade/MessageView.tsx` | What each viewer sees for the same message (hidden / redacted / full + scam warning) |
| Composer | `src/components/trade/Composer.tsx` | Text, preset phrases (kids), Record voice note, "Use sample voice note" |
| Fair meter | `src/components/trade/FairMeter.tsx` | Same trade explained per role + band |
| Scan | `src/app/(tabs)/scan.tsx` | Photo / sample card → AI identifies → real TCGplayer price when available → "List it" |
| Shop | `src/app/(tabs)/shop.tsx` + `CheckoutSheet.tsx` | Kid "Ask Alex" · teen ≤ $5 · adult anything · Pro+ adults only |
| Family / Me | `src/app/(tabs)/parent.tsx` | Mom: approvals (kid trades, kid purchases → approve and pay) + safety alerts (reason only, **never** the chat) |
| Settings | `src/app/settings.tsx` | Hosts k-ID's own permission menu (do not restyle k-ID's widget beyond the theme) |
| UI kit | `src/components/ui.tsx` | `Txt`, `H`, `Eyebrow`, `Btn` (primary gradient / quiet / danger), `Chip`, `Page`, `Rule`, `Note` (left-ruled notice) |
| Theme | `src/lib/theme.ts` | Locked palette + fonts |
| Seed data | `src/lib/seed.ts` | Personas, cards, listings, shop products |

**Data flow:** every screen calls `useDB()` (from `src/lib/api.ts`), which polls `/api/state` every 1.5s, so all devices update live. To change data, call `act({ action: ..., ... })`. Existing actions:

`reset` · `setCountry` · `kidUpdate` · `kidForget` · `listScanned` · `createOffer {listingId, fromId, offeredCardIds}` · `respondOffer {offerId, by, accept}` · `parentDecision {requestId, approve}` · `readAlert {alertId}` · `requestPurchase {persona, productId}` · `recordPurchase {persona, productId, via, requestId?}`

Other server endpoints (integrations team): `/api/message` (text + safety), `/api/voice` (Modulate), `/api/scan` (AI + prices), `/api/checkout` (k-ID purchase gate + FastSpring), `/api/kid/claim` (k-ID secret-key claim).

## 7. Design rules (locked)

- **Palette:** bg `#0A0A0F`, surfaces `#14141C` / `#1C1C27`, line `#26263A`, text `#F4F4F8` / `#A0A0B2`, primary gradient `#6C5CE7 → #9D7BF0 → #DDA0C6`, success `#4CC9A0`, warning `#E8B95A`, danger `#E8697F`. Don't drift.
- **Fonts:** Space Grotesk for headings (`H`, `Txt weight="display"`), Inter for body.
- **Style:** text-led minimalism, eyebrow labels, tight alignment. **No icon grids, no decorative icons, no heavy card containers.** Use `Note` (left rule) for notices.
- **Kid mode** (`policy.bigUI`): bigger buttons (`Btn big`), plain words, fewer numbers.
- Never say a card is "authentic". High fake-risk = "Needs a second look".
- Parents see **reasons, never the conversation**.

## 8. Partner tools: what they do (for copy and the pitch)

- **k-ID:** age gate (age, country from IP, parental consent by email), per-country rules, per-permission settings (player-managed vs guardian-managed), server-side claim with our secret key. Its widget switches to German for DE and Korean for KR.
- **Modulate** (every voice note):
  - **Fast call (about 2.5s):** transcript, phone number tagged and hidden, emotion, AI-voice (deepfake) score.
  - **Velma Triage (about 18s, background):** judges the whole conversation, e.g. "Child Safety Violation 95%", and adds it to Mom's alert.
- **Claude (Anthropic):** card recognition from a photo, message safety second opinion. Gemini is wired as a fallback but Google's model is overloaded today.
- **Pokémon TCG API:** real TCGplayer market prices for scanned cards (best effort, labeled; falls back to "AI estimate").
- **FastSpring (real, working, test store `yunhakardza.test.onfastspring.com`):** the server checks k-ID's purchase rules, creates a real FastSpring checkout **session** with the buyer pre-filled (a parent paying for a child is the buyer of record), and opens it. Pay with test card 4242 4242 4242 4242 + **the store's test CVC** (from the product's Checkout Links panel in FastSpring), then tap "I finished checkout": the server finds the completed order on that buyer's FastSpring account before marking it owned. First real test order: KARDZAA261021-3561-14127.

## 9. Personas and real k-ID facts

| Persona | Age | Role |
|---|---|---|
| **Maya** | 11 (kid in US: consent age 13) | Signs up **live** through k-ID; parent = Alex. Gets lowballed; protected |
| **Jordan** | 15 (teen) | The lowballer. Gets "fair offers build reputation" nudge |
| **Alex (Mom)** | 41 (adult) | Maya's parent: approves, pays, gets alerts. Also an adult collector |

Real k-ID behaviour we found (design around it, don't fake it):
- **Jordan (15, US):** k-ID makes **trading guardian-managed**. On the demo laptop his guardian already approved trading by k-ID email, and he switched on Messages, Voice and AI Media Upload himself in Settings.
- **Maya (11):** her parent approves her through k-ID's email and chooses what she may do.
- **Germany:** digital consent age is 16, so Jordan (15) needs a parent there. Switching his country starts a fresh k-ID session with Germany's rules.
- **Reset demo** resets Maya only; Jordan and Mom keep their k-ID sessions.

Cards (prices are **real TCGplayer market prices**, refreshed by the server from the Pokémon TCG API on every Reset; `seed.ts` prices are only the fallback): Maya owns **Mewtwo $86.16 (listed)** + Snorlax $156.56 · Jordan owns Pikachu $10.56, Eevee $2.15, Gengar $223.38 (listed) · Mom owns **Charizard $954.65 (listed)**, Blastoise $226.58, Dragonite $191.21. Each card has `card.priceSource` (e.g. "TCGplayer market · Base · updated 2026/10/15"); show it in the teen/adult price view so judges see the prices are real. Shop: Holo Binder Theme $2.99, Digital Slab $4.99, Safe Trade Protection $1.99, Collector Pro+ $7.99/mo.

## 10. Current demo scenario (you own it; change freely)

Devices: Maya on a phone (the judge holds it), Jordan on a phone, Mom on the laptop.

1. **Hook (10s):** "Kids are the most passionate card collectors, and every marketplace bans them. So they trade on playgrounds and get ripped off. Kardza is one marketplace that adapts to every age."
2. **Same screen, three people (20s):** all three on the Mewtwo listing. Maya sees "About $85", Jordan a fair range, Mom the exact price ($86.16, real TCGplayer market). Point at the banner: k-ID decides this.
3. **Live sign-up (25s):** judge's phone, Maya, age 11. k-ID: under 13 in the US, so it asks for a parent email. Mom approves on her phone, and Maya's phone opens the app by itself.
4. **Lowball + voice note (30s):** Jordan offers Eevee + Pikachu (about $13) for Mewtwo ($86) and sends the sample voice note ("text me at 555…, don't tell your mom, meet after school"). Maya sees "This trade isn't fair" + "Message hidden for your safety". Mom gets an alert with the reason and Modulate's Velma finding. Jordan sees the "lopsided" nudge.
5. **Buying + location (25s):** Maya taps "Ask Alex" and Mom pays. Jordan buys a $2.99 item himself. Switch Jordan to Germany: k-ID's rules change (consent age 16), and the k-ID widget switches to German.
6. **Close (10s):** "Same teen, same message, same screens. The kid is protected, the adult is informed, and k-ID decides what opens up."

Optional beat: Jordan sends the voice note on **Mom's Charizard** instead, and Mom (adult) sees the full transcript + scam warning + AI-voice score: same message, informed adult.

## 11. Your first tasks

1. Run the whole scenario on web at **375px** as Maya, Jordan and Mom. Fix anything broken, cramped or unclear. Make the age adaptation obvious on every screen.
2. Tighten the scenario to **2 minutes**, leading with the moment the app changes per user. Update section 10 of this file with the final script and push.
3. Check **live voice recording in iPhone Safari** (Inbox → Record voice note → Stop and send). If it fails, tell the integrations team; the "Use sample voice note" button is the demo backup.
4. Polish: loading states ("Checking…"), empty states, no red errors, consistent spacing, kid mode clearly bigger and simpler.

## 12. Troubleshooting

| Symptom | Fix |
|---|---|
| "Origin not allowed for this publishable key" | You're not on `http://localhost:8082`. Restart with `--port 8082` |
| k-ID gate stuck or errored | Tap "Start over", or "···" → Reset demo, or the labeled "Use simulated rules" link (local only) |
| Persona didn't switch | Use the chips in the top bar, or open `?as=jordan` |
| Scan says "Simulated" | AI provider down; the sample still works and is labeled |
| Checkout says "Simulated FastSpring" | FastSpring unreachable; tell the integrations team |
| Need new data / server behaviour | Ask the integrations team; don't edit `src/app/api/*` or `src/server/*` |

## 13. Q&A answers for the judges

- **Lying about country / VPN?** k-ID resolves the country from the IP server-side; when signals disagree we apply the stricter rules, so lying never unlocks anything.
- **How do physical cards move?** Kids never meet up: cards travel by tracked mail (Safe Trade Protection). On our roadmap.
- **Why FastSpring for a marketplace?** Trades are card-for-card. Kardza sells digital items and protection through FastSpring, and the parent is the buyer of record for kids.
- **Can AI prove a card is real?** No. It flags anything that looks off; a photo can't prove authenticity.
- **Do parents read kids' chats?** No. They get alerts with the reason, never the conversation.
- **Why web and not native iOS?** k-ID's web SDK runs anywhere with one codebase; k-ID's native iOS SDK (with Apple's Declared Age Range) is the production path.
