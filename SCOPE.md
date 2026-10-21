# Kardza: Build Scope v2 (k-ID SDK edition)

Replaces playbook §2–§5 (tech, k-ID details, build prompts). Product, personas, adaptation table and Q&A in `HACKATHON_PLAYBOOK.md` still stand.
Build 10:30 → 2:45 (~4h) · submit v1 by 3:05 · rehearse + stretch until 4:10 · final submit 4:15 · hard stop 4:30.

---

## 1. What changed, and the decisions it forces

| Fact (checked 10:20) | Decision |
|---|---|
| `@k-id/core` is a **React DOM** SDK (peer dep `react-dom`, injects CSS, WebCrypto device key). It can't run natively in Expo Go. | **Web:** use the SDK directly (Expo web is react-dom). **iOS (Expo Go):** the k-ID screens are a **WebView** of our own `/kid/*` web pages, which run the real SDK and `postMessage` the results back. Same k-ID flow on every device. |
| The iOS SDK (`KIDCore`, SwiftUI, Declared Age Range) needs a native build, not Expo Go. | **Out of scope today.** Q&A line: "In production we'd use k-ID's native iOS SDK, which adds Apple's Declared Age Range." No bundle ID to register. |
| k-ID gives real per-jurisdiction rules: `permissions[]` with `enabled` + `managedBy: PLAYER / GUARDIAN / PROHIBITED`, plus `requirements` (`digitalConsentAge`, `civilAge`, `minimumAge`). | **Delete the mock country table.** `getPolicy(user)` maps the k-ID session to app behavior. A country flip = a new k-ID session with `jurisdiction="DE"`, so the location beat runs on real k-ID data. |
| `POST {KID_API_BASE}/client/claim` exists (answers `CLAIM_TOKEN_INVALID` to a fake token). | `onClaim` → our `/api/kid/claim` redeems it with the secret key, so purchases and trades are **enforced on the server**. |
| Gemini key works. Newest Flash: `gemini-3.8-flash`. | Primary `gemini-3.8-flash`, fallback `gemini-flash-latest`. |
| Modulate key works (422 on an empty call = auth OK). REST batch endpoints: STT (`velma-2-stt-batch`, emotion + deepfake toggles), PII redaction, Velma Triage. | Use all three on one voice note. |
| **FastSpring API answers 401** with the given credentials. | Yunha checks in the dashboard (below). Fallback: open the **test storefront checkout URL** directly. It's still a real FastSpring test checkout; our server checks the k-ID policy first. |
| gh user `yunhalee2008` has **pull-only** access to `yunhaiee/k-idHackathon`. | The repo owner adds `yunhalee2008` as a collaborator before the first push. |

**State across 3 devices:** a server-side JSON store (`data/db.json`) behind API routes, polled every 1.5s. No setup, and it survives reloads. Firestore only if there's spare time. (Changed from playbook Prompt 6: less risk, same live effect.)

---

## 2. Architecture (one codebase, three surfaces)

```
Maya's phone (Expo Go)   Jordan's phone (Expo Go)   Mom's laptop (Expo web)
   RN screens              RN screens                  same screens (react-native-web)
   k-ID = WebView ─┐       k-ID = WebView ─┐           k-ID = @k-id/core inline
                   ▼                       ▼
      Expo server (dev: --tunnel · demo: Google Cloud Run, same code)
        /kid/gate, /kid/settings   web pages running @k-id/core (WebViews load these)
        /api/kid/claim     claimToken → k-ID /api/v1/client/claim (secret key) → session → db
        /api/state         GET snapshot (polled) · POST actions (offer, message, approve…)
        /api/scan          photo → Gemini 3.8 Flash → {name, set, priceUsd, fakeRisk, reasons}
        /api/voice         audio → Modulate STT(+emotion, deepfake) + PII redaction + Triage
        /api/message       text → rules (phone, email, links, "text me", meetups) + Gemini check
        /api/checkout      getPolicy(user) FIRST → FastSpring session / storefront URL
        /api/tts           (stretch) Inworld read-aloud for kid mode
```

**Fallback if Expo Go or the tunnel breaks:** phones open the Cloud Run URL in Safari. It's the same app, and k-ID runs natively there. That's the "flexible" path: any persona on any device, web or iOS.

### k-ID integration (exact)
- `<KidCoreProvider publishableKey={EXPO_PUBLIC_KID_PUBLISHABLE_KEY} baseUrl={EXPO_PUBLIC_KID_FAPI_BASE} declare={…}>` → `<KidSessionProvider jurisdiction=… age=… sessionId=… challengeId=… onSession onChallenge onClaim>` → `<KidAgeGate>` with all slots: `Pass` (posts "pass" + permissions), `Pending` ("Waiting for your grown-up"), `Fail`, `Prohibited`, `Error`.
- **Declare** the features we really build, nothing else:
  `in-game-purchases` (Shop) · `virtual-property-ownership` (list/trade cards) · `text-chat-private` (offer messages) · `voice-chat` (voice notes) · `camera-access` (Scan) · `ai-media-upload` (photo to Gemini) · `custom-username` (sign-up).
  `supportEmail`: **yunhalee@stanford.edu** · `iconUrl`: bundled `assets/icon.png` · `privacyPolicyUrl` / `termsOfServiceUrl`: our own `/privacy` and `/terms` pages, added once the Cloud Run URL exists (left out until then, so k-ID keeps its defaults). *Yunha: change any of these if you want.*
- **Persist per persona + country:** `sessionId` (from `onSession`) and `challengeId` (from `onChallenge`, while pending), stored in `db.json` and passed back on mount.
- **Persona sessions:** Jordan (15) and Mom (adult) are pre-onboarded with `age={{age}}` + `jurisdiction`. Maya signs up live through the full widget (`jurisdiction="auto"`). Keep a pre-onboarded "Maya (backup)" in case it fails.
- **Country picker** (US / DE / UK / KR) → remount `KidSessionProvider` with that code (cached session per country). The widget switches to the German locale on DE (`@k-id/core/localizations`).
- **`<KidSettings>`** inside `<KidSettingsProvider sessionId>` on a Settings screen (WebView on iOS). Maya asks to turn on a guardian-managed permission → k-ID emails Mom → Mom approves → the feature unlocks live on Maya's phone.
- **`<KidFeature name>`**: our cross-platform `<KidPermission>`. On web it wraps the real `<KidPermission>`. On native it reads the claimed k-ID session from the server. Server routes re-check the same permission (k-ID: "always enforce server-side").

### `getPolicy(user)`: the only place behavior is decided
Input: the persona's k-ID session (`permissions`, `ageStatus`, `jurisdiction`) + `requirements` + age. Features never check age.

| App feature | k-ID permission | `enabled` | `GUARDIAN` + off | `PROHIBITED` |
|---|---|---|---|---|
| Buy in Shop | `in-game-purchases` | Buy (teen: up to $5, then parent) | "Ask a parent" → request in Mom's Parent tab → Mom pays | hidden |
| List / trade cards | `virtual-property-ownership` | trade freely, nudge if lopsided | every trade needs a parent's OK | browse only |
| Offer messages | `text-chat-private` | free text, filtered | preset phrases only | no chat |
| Voice notes | `voice-chat` | record + send (screened) | only "Use sample", hidden on risk | hidden |
| Scan | `camera-access` + `ai-media-upload` | camera → Gemini | "Use sample card" only | hidden |
| Collector Pro+ subscription | age ≥ `civilAge` (stretch: k-ID `KidSessionVerifyAge`) | visible | hidden | hidden |

Presentation band, from k-ID's requirements: `age < digitalConsentAge` → **kid** (plain price "About $55", voice hidden on risk + parent alert with reason only, bigger buttons) · `< civilAge` → **teen** (fair range, redacted transcript + warning) · otherwise **adult** (exact price + market, full transcript + scam badge).

**Banner on every screen:** `Rules from k-ID · Jordan, 15 · Germany · digital consent age 16`. Tap it to see each permission as On / Needs a parent / Not available, using k-ID's `managedBy`.

---

## 3. Scope by priority

**P0: the demo depends on these**
1. Scaffold, persona switcher (Maya / Jordan / Mom) + country picker + Reset demo, banner, shared state across devices.
2. k-ID: gate (web + WebView), claim API, getPolicy from k-ID, live Maya consent loop, Jordan US ↔ DE.
3. Offers + fair-trade meter + Modulate voice safety (with a bundled "Use sample voice note").
4. Shop: FastSpring checkout gated by policy, kid → parent request → Mom pays.
5. Scan with Gemini via a bundled "Use sample card" (camera optional).

**P1: makes it win**
6. `<KidSettings>` guardian upgrade (Maya asks, Mom approves, the feature unlocks live).
7. Google Cloud Run deploy (public URL for the submission + Safari fallback).
8. German widget locale on DE · `/privacy` + `/terms` pages declared to k-ID.

**P2: only after v1 is submitted**
9. Inworld TTS "Read it to me" in kid mode (age-adaptive accessibility).
10. k-ID `KidSessionVerifyAge` to unlock Collector Pro+ for Mom ("Verified adult by k-ID").
11. Scenario B (same voice note to Mom as an adult collector: full transcript + scam badge).
12. Firestore swap.

**Not doing:** native KIDCore iOS build, real card shipping, payouts between users, a separate kids app.

**Fallback rule:** every partner call has a labeled fallback (`Simulated · Modulate unavailable`), pre-baked for the bundled sample card and voice note, so the demo never stalls.

---

## 4. Timeline + who does what

| Time | Block (Oliver drives Claude Code) | Done when |
|---|---|---|
| 10:30–11:00 | **B1 Scaffold + k-ID spike** | Web and Expo Go both open. The k-ID widget renders on web **and** inside the iPhone WebView. *Biggest risk, retire it first.* |
| 11:00–11:50 | **B2 k-ID for real** | Maya signs up live → Mom's email → approve → Maya's phone enters the app. Jordan US vs DE shows different k-ID rules. KidSettings renders. |
| 11:50–12:25 | **B3 Scan + Gemini** | Sample card → price shown 3 ways by persona → "List it". |
| 12:25–1:25 | **B4 Offers + Modulate** (eat at the desk) | Jordan's lowball + voice note → Maya: hidden + fair meter · Mom: alert + approval · Jordan: nudge. Works across 3 devices. |
| 1:25–2:10 | **B5 FastSpring shop** | Maya asks → Mom pays (test card 4242…) · Jordan buys $2.99 directly · Pro+ adults only. |
| 2:10–2:45 | **B6 Cloud Run + polish** | Public URL works on phones in Safari. Record a **backup demo video**. |
| 2:45–3:05 | **Submit v1** | Form done (see §7). |
| 3:05–4:10 | P1/P2 stretch + rehearse the demo 3× | Two clean runs back to back. |
| 4:15 | **Final resubmit** | |

**Yunha, in parallel right now (none of this blocks Oliver):**
1. **FastSpring 401:** Dashboard → Developer Tools → APIs → API Credentials; regenerate if needed. Then create products `holo-binder-theme` $2.99, `digital-slab` $4.99, `collector-pro` $7.99/mo, and paste the store host (`xxx.test.onfastspring.com`) + storefront path into `.env`.
2. **Google Cloud:** a GCP project with billing for Cloud Run (it's a Google event, so ask Google staff for credits), then `brew install --cask google-cloud-sdk && gcloud auth login`.
3. **Inworld:** create the team workspace, put the API key in `.env` as `INWORLD_API_KEY`.
4. **Mom's inbox:** pick the parent email k-ID will send consent to (e.g. `yunhalee0112+mom@gmail.com`) and keep it open on your phone.
5. **Assets:** 3 clear card photos; a 10s voice note from Oliver: *"Deal? It's a good trade. Text me at 555-0134, don't tell your mom."*
6. **Confirm** the team name and members (the event site lists **"Binder"** with Oliver C., Yunha L., **Raj S.**; the playbook says Kardza). If Raj is on the team: he tests as Maya each round, records the backup video, writes the README.

---

## 5. Judging criteria → what we show

| Criterion | How we score |
|---|---|
| **It genuinely adapts** | One app, the same screens; 3 ages × 2 countries. Price view, chat, voice handling, trades, buying and subscriptions all change, and the banner says why ("Germany: digital consent age 16"). Even the k-ID widget switches to German. |
| **Real use of the stack** | k-ID does the deciding: age gate, IP jurisdiction, verified parental consent, per-permission rules, guardian upgrades (KidSettings), server-side claim, declare manifest. FastSpring: real test checkout, parent is buyer of record, subscription adults-only. Modulate: transcribe + redact + deepfake + triage on every voice note. Gemini: card ID, price, fake risk, message second opinion. Cloud Run hosts it. |
| **It works** | Live on 2 iPhones + a laptop. Sample buttons mean no dependence on camera or mic. Labeled fallbacks. Safari URL as backup. Rehearsed 3×. |
| **People would use it** | "Kids are the most passionate card collectors, and every marketplace bans them, so they trade on playgrounds and get ripped off." |
| **Ambition** | iOS + web from one codebase, a real parental-consent loop across devices, 4 partner tools + Google, all in 4 hours. |

---

## 6. Demo (2 min; lead with the change, per the judging guide)

1. **Hook (10s):** the line above.
2. **Same screen, three people (20s):** all 3 devices on the same Charizard listing. Maya: "About $55". Jordan: a fair range. Mom: exact price + market. Point at the banner: "k-ID decides this."
3. **Live sign-up (25s):** the judge holds Maya's phone → birthday → k-ID: under 13 in the US → parent email → Mom approves on her phone → Maya's phone opens the app by itself.
4. **Lowball + voice note (30s):** Jordan offers a lowball + sends the voice note. Maya: "This trade isn't fair" + "Message hidden for your safety. We told your parent." Mom: alert with the reason only (Modulate caught a phone number + pressure) and the trade waits for her. Jordan: "Fair offers build your reputation."
5. **Buying + location (25s):** Maya taps Buy → "Ask a parent" → Mom pays with FastSpring. Jordan buys directly in the US → switch him to Germany → k-ID: "under 16 in Germany, a parent approves", widget in German.
6. **Close (10s):** "Same teen, same message, same screens. The kid is protected, the adult is informed, and k-ID decides what opens up."

---

## 7. Submission form

- **Tools used:** ☑ k-ID tooling · ☑ FastSpring · ☑ Modulate · ☑ Inworld *(only if P2-9 ships)* · ☑ Google Cloud hosting *(Cloud Run)* · ☑ Other: **Gemini 3.8 Flash (Google AI Studio), Expo / React Native (iOS + web)**.
- **One-liner:** *Kardza is a trading-card marketplace that adapts to every age and country: kids trade with a parent in the loop, teens buy within limits, adults trade freely, k-ID decides the rules, and AI keeps every trade fair and every voice note safe.*
- **Links:** Cloud Run URL + GitHub repo + backup video. Submit v1 at 3:00, resubmit by 4:15. If the form is down, post in Discord.

---

## 8. Build prompts (paste one at a time; after each: run, click through as Maya / Jordan / Mom, fix, commit, push)

**P1 Scaffold + k-ID spike**
> Read SCOPE.md and HACKATHON_PLAYBOOK.md. Check the latest Expo SDK that Expo Go on iOS supports and scaffold Expo Router + TypeScript with `web.output: "server"`. Install packages only with `npx expo install` (react-native-webview, expo-linear-gradient, expo-image-picker, expo-image-manipulator, expo-audio, expo-web-browser, async-storage, fonts). Lock the playbook palette; text-led, no icon grids. Build: the db.json store behind `/api/state` (GET snapshot, POST action) with 1.5s polling; seed the personas + 8 cards; persona switcher + country picker (US/DE/UK/KR) + Reset; tabs Home / Scan / Inbox / Shop / Parent + Listing + Settings; the k-ID banner. k-ID spike: `npm install ~/Downloads/k-id-core-web.tgz`. Add a `/kid/gate` web page that renders KidCoreProvider → KidSessionProvider → KidAgeGate (declare per SCOPE.md §2) and posts results via `window.ReactNativeWebView?.postMessage`, plus a native screen that loads it in a WebView. Keep @k-id/core out of the native bundle (`.web.tsx` split). Prove it renders on web and in Expo Go. Commit, push.

**P2 k-ID for real**
> Wire onSession / onChallenge / onClaim per SCOPE.md §2. `/api/kid/claim` redeems the claimToken at `{KID_API_BASE}/client/claim` with `KID_SECRET_KEY` (log the real response shape; if it lacks permissions, find the server session read endpoint, or fall back to client-reported permissions labeled as such). Store the session per persona + country; resume with sessionId/challengeId. `lib/policy.ts` getPolicy maps k-ID permissions + requirements exactly as in the SCOPE.md table; `<KidFeature>` on both platforms. Banner shows k-ID's managedBy reasons. Country flip = new session with that jurisdiction (+ German widget locale on DE). Add the Settings screen with KidSettingsProvider/KidSettings (WebView on iOS) that syncs changes back. Test: Maya live consent, Jordan US vs DE, Mom adult. Commit, push.

**P3 Scan + Gemini**: playbook Prompt 3, models from `.env`, with a bundled sample card and a pre-baked fallback. The price view comes from getPolicy; Scan is gated by `<KidFeature name="camera-access">`.

**P4 Offers + Modulate**: playbook Prompt 4, reading Modulate docs for STT (emotion + deepfake on), PII redaction and Velma Triage. Display by getPolicy band; chat and voice gated by `text-chat-private` / `voice-chat`; trades by `virtual-property-ownership`. Bundled sample voice note + pre-baked fallback.

**P5 FastSpring**: playbook Prompt 5, but `/api/checkout` enforces `in-game-purchases` from the **claimed** k-ID session server-side. Try the Sessions API; on 401, fall back to the storefront URL. Kid → parent request; Mom completes checkout as buyer.

**P6 Cloud Run + polish**: `expo export -p web` → express server via `expo-server` → Dockerfile → `gcloud run deploy kardza --source . --max-instances 1 --allow-unauthenticated` with the env vars from `.env`. Add `/privacy` and `/terms` and set them in declare. Then playbook Prompt 7 polish + README (how each partner is used).
