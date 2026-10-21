# Kardza

**A trading-card marketplace that adapts to every age and every country.**

Kids are the most passionate card collectors, and most marketplaces ban them, so they trade on playgrounds and get ripped off. Kardza is one marketplace for everyone: kids trade with a parent in the loop, teens buy within limits, adults trade freely. **k-ID decides the rules** for each person in their country, and AI keeps every trade fair and every message safe.

Built at **Build for Everyone (Google x k-ID)**, Commerce & Marketplaces track, October 21, 2026.

---

## The demo

Four real people, the same screens, four different apps (open `/demo` to see them side by side):

| Persona | Who | What k-ID gives them |
|---|---|---|
| **Maya**, 14, United States | Collector | Over the US consent age (13): chats and shops on her own; k-ID keeps trading guardian-managed, so a guardian approved it once |
| **Leo**, 14, Germany | Collector | Under Germany's consent age (16): his mom Anna approves offers, purchases and who can reach him |
| **Anna**, 42, Germany | Leo's parent | Approves and pays. Sees safety alerts with the **reason**, never the conversation |
| **Devon**, 25, United States | Adult trader | Everything is open; his credibility drops when he breaks the rules |

The story: Devon offers $20 and a voice note ("text me at 555…, don't tell your mom, meet after school") for two Charizards worth about $70.

- **Maya** sees "This trade isn't fair. Your card is worth about $71," a scam warning and a redacted transcript.
- **Leo** never receives it. The offer is held on the server for Anna.
- **Anna** gets an alert with Modulate's findings and can block Devon or let Leo see it.
- **Devon** loses 5 credibility points (62 → 57).
- Maya counters at $65, Devon accepts, and the deal is agreed.
- In the Shop, Maya buys a $4.99 item herself. Leo asks a parent, and Anna pays through a real FastSpring checkout.

Every persona has a **real, verified k-ID session**. Nothing in the demo is a hardcoded age check.

## How the adaptation works

Every screen asks one function, `getPolicy(user)` in [`src/lib/policy.ts`](src/lib/policy.ts), what this person may see and do. The policy is built only from that user's k-ID session for their current country: k-ID's per-permission rules (on, off, player-managed, guardian-managed) plus the country's digital-consent and civil ages. **The UI never checks age.**

| Kardza feature | k-ID permission |
|---|---|
| Shop | `in-game-purchases` |
| Trading | `virtual-property-ownership` |
| Messages | `text-chat-private` |
| Voice notes | `voice-chat` |
| Card scan | `camera-access` + `ai-media-upload` |
| Display name | `custom-username` |

The same policy is enforced again on the server ([`src/server/trade.ts`](src/server/trade.ts), [`src/app/api/checkout+api.ts`](src/app/api/checkout+api.ts)), so a modified client can't unlock anything. Switching a user's country starts a fresh k-ID session with that country's rules, and k-ID's own widget changes language.

## Partner tools and how we use them

**k-ID** (`@k-id/core` web SDK)
- Age gate with country from IP, parental consent by email, per-country rules, and k-ID's own settings menu inside the app.
- The one-time claim token is redeemed on the server with our secret key ([`src/app/api/kid/claim+api.ts`](src/app/api/kid/claim+api.ts)), so the server holds the authoritative result, not the browser.

**Modulate** ([`src/server/modulate.ts`](src/server/modulate.ts), [`src/app/api/voice+api.ts`](src/app/api/voice+api.ts))
- Every voice note goes through `velma-2-stt-batch` (about 2.5s): transcript, phone numbers tagged and hidden, emotion, and an AI-voice (deepfake) score. We decide delivery from this right away.
- Velma Triage (`velma-2-batch`, about 18s) then runs in the background on the whole conversation, for example "Child Safety Violation", and its finding is added to the parent's alert.

**FastSpring** ([`src/server/fastspring.ts`](src/server/fastspring.ts), test store)
- The server checks the buyer's k-ID purchase rules first, then creates a real checkout session with the buyer pre-filled. When a parent pays for a child, the parent is the buyer of record.
- After checkout, the server confirms the completed order through the FastSpring API before the item is marked owned.

**Also used**
- **Claude (Anthropic)**, `claude-opus-5-5` with structured output ([`src/server/ai.ts`](src/server/ai.ts)): identifies a card from a photo, and gives a second opinion on message safety after fast deterministic rules ([`src/server/safety.ts`](src/server/safety.ts)). Gemini is wired as a fallback.
- **Pokémon TCG API** ([`src/server/prices.ts`](src/server/prices.ts)): real TCGplayer market prices for every card, shown with their source, for example "TCGplayer market · Flashfire · updated 2026/10/15".

When a partner service is unreachable, Kardza falls back to a result that is **clearly labeled "simulated"** on screen. It never silently fakes one.

## Architecture

- **Expo SDK 58 + Expo Router + TypeScript**, shipped as a web app (phones open it in the browser; "Add to Home Screen" makes it full-screen).
- **Server:** Expo Router API routes in [`src/app/api/`](src/app/api), all secrets server-side only.
- **Shared state:** [`src/server/db.ts`](src/server/db.ts), a JSON file locally or Upstash Redis when hosted. Every device polls `/api/state` every 1.5s, so all phones update live.

```
src/app/            screens (Expo Router) and API routes (src/app/api/*+api.ts)
src/lib/policy.ts   getPolicy(user): the only place behaviour is decided
src/server/         trade rules, k-ID claim, Modulate, Claude/Gemini, FastSpring, prices, shared state
src/components/     UI kit, trade thread, k-ID integration (src/components/kid/)
```

## Running it

You need Node 24 (what we used), the k-ID web SDK package at `vendor/k-id-core-web.tgz` (pre-release, not in git), and a `.env` with:

```
EXPO_PUBLIC_KID_PUBLISHABLE_KEY, EXPO_PUBLIC_KID_FAPI_BASE, KID_API_BASE, KID_SECRET_KEY
MODULATE_API_KEY
ANTHROPIC_API_KEY, GEMINI_API_KEY, AI_ORDER=claude,gemini
FASTSPRING_STORE, FASTSPRING_API_USERNAME, FASTSPRING_API_PASSWORD, FASTSPRING_CHECKOUT_MODE=session
```

```bash
npm install
npx expo start --port 8082            # http://localhost:8082/?as=maya (or leo, anna, devon)
npx expo start --tunnel --port 8082   # public https URL for real phones
```

Port 8082 matters: k-ID only answers origins on the publishable key's allow list. Open `/demo` for all personas side by side, and use "···" → Reset demo to start over (k-ID sessions are kept).

## Team

- **Yunha Lee**: integrations (k-ID, Modulate, FastSpring, AI, server rules)
- **Oliver Chen**: product, UI and the demo
