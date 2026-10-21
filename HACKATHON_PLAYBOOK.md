# Kardza: Hackathon Playbook (Build for Everyone, Wed Oct 21)

> **10:20 update:** k-ID shipped its SDK. `SCOPE.md` now replaces §2–§5 (tech, k-ID, build prompts) and the demo script. §1 product, §3 adaptation table and §7 Q&A still apply.

Team: **Oliver** (drives Claude Code, plays Jordan the teen) · **Yunha** (yunhalee@stanford.edu: k-ID setup, keys, testing, pitch + submission, plays Mom/adult)
Track: **Commerce & Marketplaces**. Confirm at the help desk before 10:20.
Rules: **no code before 10:20**. This file is a plan/spec (allowed). Hard deadline **4:30 PM**; form opens 3:00. Demo = 2 min + 1 min Q&A.

---

## 0. How to build

Build as fast as possible, in this order, with no waiting: scaffold → scan → offers + voice safety → purchases → polish. k-ID (Prompt 2) and live sync (Prompt 6) slot in whenever they're ready. Don't get stuck: if anything fights you, ship a clearly labeled simulated version and move on. A working slice beats an unfinished whole. Commit and push after every step.

## 1. Product (what we're building today)

**Kardza: a trading-card marketplace that adapts to every age.** Same screens for everyone; what each person can see, say, trade and buy changes by age and consent (decided by k-ID).

**One-liner (submission form):** *Kardza is a trading-card marketplace that adapts to every age: kids trade with a parent in the loop, teens buy within limits, adults trade and buy freely, and AI keeps every trade fair and every message safe.*

### Personas (switcher in the header; each device remembers its persona)
| Persona | Age | Played by | Role in demo |
|---|---|---|---|
| **Maya** | 11 (kid) | live sign-up (judge can hold this phone) | Gets lowballed; protected |
| **Jordan** | 15 (teen) | Oliver | The lowballer; gets a "fair offers build reputation" nudge |
| **Mom (Alex)** | adult + Maya's parent | Yunha | Approves consent/trades, gets alerts, buys; also the adult collector in Scenario B |
Map these to k-ID's test personas once we see them.

### Demo script (2 min)
1. **Hook (10s):** "Kids are the most passionate card collectors, and every marketplace bans them. So they trade on playgrounds and get ripped off. Kardza is one marketplace that adapts to every age."
2. **Sign-up (25s):** Maya signs up (name, username, birthday; country from IP) → **k-ID**: under 13 in the US → parent consent → Mom approves → Maya lands in the app.
3. **Buying adapts (25s):** Maya taps Buy on a Holo Binder Theme → "Ask a parent" → Mom approves + pays (**FastSpring**). Jordan buys it himself. Collector Pro+: adults only.
4. **Scenario A: teen vs kid (30s):** Maya scans + lists a card (**Gemini**: "About $55"). Jordan offers a lowball + voice note "deal? text me at 555…" → Maya sees "This trade isn't fair" + "Message hidden for your safety"; Mom gets an alert and the trade needs her approval (**Modulate** transcribed + redacted).
4b. **Location adapts (15s):** switch Jordan's country US → Germany → the same purchase now needs a parent, with k-ID's reason shown.
5. **Scenario B: teen vs adult (20s):** same offer + voice note to Mom as an adult collector → full transcript, number flagged with a scam warning, fair-trade numbers; she decides freely.
6. **Close (10s):** "Same teen, same message. The kid is protected; the adult is informed and free. k-ID decides what opens up."

---

## 2. Tech decisions

- **Expo (React Native) + TypeScript + Expo Router**, demoed in **Expo Go** on phones, with **web as the backup** (press `w`, same code).
- **Secrets stay on a server:** use **Expo Router API routes** (`app/api/*+api.ts`). They run on the Expo dev server on the laptop; the phones call them through the same dev server. Gemini, Modulate, FastSpring and k-ID keys live only there (never `EXPO_PUBLIC_`).
- **Connection plan (critical):** run `npx expo start --tunnel` (venue Wi-Fi may block phone↔laptop). Backups: phone hotspot for the laptop + phones; then web (`w`) on the laptop. Check the Expo SDK in `package.json` matches the Expo Go version on both phones before building anything.
- **Data:** one store module (`lib/store.ts`) with simple read/write functions; starts in-memory/AsyncStorage; **Prompt 6** swaps it to Firestore real-time (Firebase JS SDK works in Expo Go).
- **Repo:** new GitHub repo **`kardza-hackathon`** (separate from the startup repo; fresh code only). Collaborators: Oliver + **yunhalee@stanford.edu**. Commit + push after every prompt. `.env` never committed.
- **Submission link:** the GitHub repo + an Expo web export deployed to Vercel/EAS Hosting if time allows (the form accepts repo links).

### Keys (`.env`, server-side only unless marked EXPO_PUBLIC)
```
GEMINI_API_KEY=            # server only
MODULATE_API_KEY=          # server only
FASTSPRING_API_USERNAME=   # server only
FASTSPRING_API_PASSWORD=   # server only
FASTSPRING_STOREFRONT=     # e.g. kardza_store.test.onfastspring.com/popup-xxxx (test)
KID_API_KEY=               # k-ID (fill at 9:30)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```
FastSpring products (test store): `holo-binder-theme` $2.99 · `digital-slab` $4.99 · `collector-pro` $7.99/mo (adult only) · optional `safe-trade-protection` $1.99. Test card **4242 4242 4242 4242**, any future expiry, CVV from the product's Checkout Links panel.

---

## 3. Adaptation rules (the core: one app that adapts to age AND location)

**Not a kids version and an adults version.** One app, one set of screens. Every feature reads its permissions from k-ID for **this user's age and this user's location**, and adapts in place: a button, a price view, a message, a checkout limit. Change the age or the country and the same screen changes.

All permissions come from ONE function: `getPolicy(user)`, which asks k-ID with `{ age signal, country/region }` and returns
```
{ ageBand, jurisdiction, needsParentConsent, canPurchase, purchaseLimitUsd,
  purchaseNeedsParent, canBuySubscription, chatMode: 'presets'|'filtered'|'open',
  voiceMessages: 'hide-on-risk'|'redact'|'transcript+warning',
  tradeNeedsParentApproval, priceView: 'plain'|'range'|'full',
  reasons: string[] }   // plain-language "why", e.g. "Under 16 in Germany: a parent approves purchases"
```
- **Source of truth = k-ID's new age tool** (released at the event). Until it's wired, `lib/kid.ts` is a mock behind the same interface, with a small per-country rules table (e.g. digital consent age: US 13, UK 13, Canada 13, France 15, Germany 16, Spain 14, South Korea 14) so location visibly matters.
- **Features never check age directly.** They only read `getPolicy(user)` fields. That's what makes it truly adaptive and easy to swap to k-ID.
- Show a small chip on every screen: **"Rules from k-ID · Jordan, 15 · United States"**, tappable to show `reasons`.
- **Demo control:** in the persona switcher, a **country picker** (US / Germany / UK / Japan) so we can show the same person in a different place getting different rules.

Example of how the mock behaves (k-ID replaces it):

| | Under consent age | Teen above consent age | Adult |
|---|---|---|---|
| Sign-up | parent consent required | allowed | allowed |
| Price view | "About $55. That's what people usually pay" | fair range + lowball warning | exact price + market detail |
| Buy digital items | ✗ → "Ask a parent" | ✓ up to limit; above → parent | ✓ |
| Subscription | ✗ | ✗ | ✓ |
| Trades | parent approves every trade | free; nudge if lopsided | free |
| Chat | preset messages + voice | text + voice, filtered | open |
| Risky voice/text | **hidden** + parent alert (reason only) | **redacted** + warning | full transcript + **warning badge** |
| UI | bigger buttons, plain words | standard | standard + details |

**Key demo beat (location):** Jordan, 15, in the **US** buys a $4.99 item directly. Switch his country to **Germany** (digital consent at 16) → the **same screen** now says "A parent needs to approve this," with k-ID's reason. Same person, different place, different rules.

---|---|---|---|
| Sign-up | parent consent required | allowed | allowed |
| Price view | "About $55. That's what people usually pay" | fair range + lowball warning | exact price + market detail |
| Buy digital items | ✗ → "Ask a parent" (parent approves + pays) | ✓ up to $5; above → parent | ✓ |
| Collector Pro+ subscription | ✗ | ✗ | ✓ |
| Trades | parent approves every trade | free; nudge if lopsided | free |
| Chat | preset messages + voice | text + voice, filtered | open |
| Risky voice/text message | **hidden** + parent alert (reason only) | **redacted** + warning | full transcript + **warning badge** |
| UI | bigger buttons, plain words | standard | standard + details |
Always show a small "Rules from k-ID for {country}" chip so judges see k-ID doing the work.

---

## 4. Claude Code prompts (paste in order, one at a time, after 10:20)

### Prompt 1: Scaffold
```
Build "Kardza", a hackathon app (Google x k-ID Build for Everyone, Commerce
track). Read KARDZA_HACKATHON_PLAYBOOK.md fully first and follow it exactly.
Create an Expo app (latest SDK that matches the Expo Go app on our phones;
check first) with Expo Router + TypeScript. Must run in Expo Go (no custom
native modules) and on web. Read AGENTS.md / Expo docs for the current SDK
before using any Expo API. Server-side secrets go in Expo Router API routes
(app/api/*+api.ts); set "web": {"output": "server"} as needed.
Dark premium theme: background #0A0A0F, surfaces #14141C/#1C1C27, text
#F4F4F8/#A0A0B2, signature gradient #6C5CE7 → #9D7BF0 → #DDA0C6 for primary
buttons (expo-linear-gradient), success #4CC9A0, warning #E8B95A, danger
#E8697F. Fonts: Space Grotesk headings, Inter body (@expo-google-fonts).
Rounded cards, big friendly buttons, smooth transitions. Logo: assets/logo.png.

Set up:
- lib/store.ts: ONE store module for all app data (users, cards, listings,
  offers, messages, alerts, consentRequests, purchases) with simple async
  read/write/subscribe functions, in-memory + AsyncStorage for now, designed
  so it can later sync through Firestore.
- lib/policy.ts: getPolicy(user) exactly as in playbook §3 (age AND country),
  using a mock k-ID provider (lib/kid.ts) with a per-country rules table,
  behind an interface we'll replace with k-ID's real age tool. Features must
  never check age directly, only getPolicy fields.
- Seed data: personas Maya (11), Jordan (15), Mom "Alex" (adult, Maya's
  parent); 8 trading cards with name, set, image URL, market price.
- Persona switcher in the header (Maya / Jordan / Mom) + a country picker
  (US / Germany / UK / Japan) + "Reset demo". Each device remembers its
  persona. Changing age or country instantly re-renders every screen.
- Tabs: Home (my cards + market), Scan, Inbox (offers + messages), Shop
  (digital items), Parent (consent, approvals, alerts; shown for Mom). Plus a
  Listing detail screen. Placeholder content is fine; navigation must work.
- A visible chip "Rules from k-ID · <name>, <age> · <country>" on every
  screen, tappable to show the policy's plain-language reasons.
Run it with `npx expo start --tunnel` and confirm it opens in Expo Go and web.
Then create a private GitHub repo "kardza-hackathon", push, and invite
yunhalee@stanford.edu as a collaborator (gh if available, else tell me how).
Commit and push after every step from now on. Never commit .env.
```

### Prompt 2: k-ID sign-up + consent (fill details at 9:30)
```
Replace the mock in lib/kid.ts with the real k-ID integration. Details from the
event: [PASTE k-ID SDK/API docs link, setup steps, test personas, how age
checks and parental consent work].
Build sign-up: first name, username, birthday (no email for kids), country
detected from the request IP (server-side header, e.g. x-vercel-ip-country;
fallback to the browser locale), shown as "Country: United States ✓".
Send to k-ID → store the returned age band/permissions on the user →
getPolicy(user) must read from k-ID's result. If k-ID requires parental
consent: ask for the parent's email, create a consent request (or use k-ID's
consent flow), show it in Mom's Parent page; when approved, Maya lands in the
app. Map our personas to k-ID's test personas. Keep a "simulate k-ID" fallback
flag if their API is unreachable. Test all three personas, commit, push.
```

### Prompt 3: Scan + Gemini + listing
```
Scan tab: take a photo or pick one (expo-image-picker, shrink with
expo-image-manipulator, base64). API route /api/scan sends it to Gemini (GEMINI_API_KEY, newest Flash model,
fall back to another Flash model on error/slow, 12s timeout, JSON output):
{name, set, number, estimatedPriceUsd, fakeRisk: low|medium|high, reasons[]}.
Show the result by policy.priceView: kid "About $55. That's what people usually
pay", teen fair range, adult exact price. Never say "authentic"; high risk =
"Needs a second look". "List it" adds it to the market. Add a "Use sample card"
button using a bundled image so the demo never depends on the camera.
Commit, push.
```

### Prompt 4: Offers, fair meter, Modulate voice safety
```
Listing → "Make an offer": pick card(s) from your binder. Fair-trade meter
(value of both sides): kid sees "This trade isn't fair. Your card is worth about
$X more."; teen proposer sees "This offer is very lopsided. Fair offers build your
reputation."; adult sees numbers. Kid trades go to the parent for approval.
Messages on each offer: text + voice notes (record with expo-audio in Expo Go;
also a "Use sample voice note" button with a bundled audio file for a reliable
demo). API route /api/voice sends audio to
Modulate (MODULATE_API_KEY; read Modulate's quickstart/docs) for transcription,
sensitive-detail redaction (phone numbers, addresses, handles), deepfake /
impersonation detection and emotion/pressure signals. Also run text messages
through a rules check (phone/email/links/"text me"/meetups) + Gemini second
opinion. Display by policy.voiceMessages: kid = hidden ("Message hidden for your
safety. We told your parent.") + alert to the parent with the reason only;
teen = redacted transcript + warning; adult = full transcript + scam warning
badge ("Asking to move off Kardza is a common scam"). Show audio + written
transcript where allowed. Commit, push.
```

### Prompt 5: FastSpring purchases by age
```
Shop with FastSpring test products: holo-binder-theme $2.99, digital-slab
$4.99, collector-pro $7.99/mo (adult only), safe-trade-protection $1.99.
API route /api/checkout: check getPolicy(user) FIRST (server-side), then
create a FastSpring checkout session via the FastSpring API
(FASTSPRING_API_USERNAME/PASSWORD, test store) and return the checkout URL;
open it with expo-web-browser. If the API fails, fall back to the test
storefront URL (FASTSPRING_STOREFRONT, .test.). Rules: kid → "Ask a parent" creates a purchase request in Mom's Parent
page; Mom approves → she completes checkout. Teen → buys up to $5 directly,
above that → parent. Adult → buys anything incl. Pro+. Kids/teens never see the
subscription. Mark items owned after success (webhook or return URL). Test card
4242 4242 4242 4242. Commit, push.
```

### Prompt 6: Live sync across devices (when the core flow works)
```
Move lib/store.ts to Firebase Firestore (EXPO_PUBLIC_FIREBASE_* env vars,
test-mode database) with onSnapshot so offers, messages, alerts, consent and
purchase requests appear on every device within ~2 seconds. Keep the same store
API so pages don't change. Each device picks its persona from the switcher.
"Reset demo" clears and reseeds Firestore. If Firestore fails, fall back to
local data. Test with two browser windows, then two phones. Commit, push.
```

### Prompt 7: Polish + demo-proofing
```
Polish for the demo: consistent spacing, loading states, empty states, smooth
transitions, no red errors, works on small phones. Make the age changes obvious:
a small banner "You're viewing as Maya (11) · rules from k-ID". Run the full
demo script in the playbook 3 times as each persona (Expo Go on two phones +
web) and fix anything broken. If time allows, export web and deploy (Vercel or
EAS Hosting) for the submission link. Write a short README (what it is, how
each partner is used, how to run). Commit, push.
```

---

## 5. k-ID details (fill at 9:30)
- SDK/API + docs link:
- Setup steps done (1/2):
- Test personas (names/ages/regions):
- Age check method (birthday / estimate / ID) + test mode behavior:
- Parental consent flow (email? link? instant approve in test?):
- Permissions/feature flags we can read:

---

## 6. Submission form (opens 3:00, deadline 4:30)
- Team: Kardza · Members: Oliver Chen, Yunha Lee · Track: Commerce & Marketplaces
- One-liner: see §1
- Links: GitHub repo (+ web deploy URL if done; else note "runs in Expo Go")
- Tools used: k-ID (age, jurisdiction, permissions, parental consent), Gemini (card recognition, pricing, fair-trade + message checks), Modulate (voice transcription, redaction, deepfake/scam detection), FastSpring (age-gated checkout), Firebase Firestore (live sync), Expo/React Native
- Confirm rules followed. **Submit v1 at 3:00, resubmit later.** Backup: post in the Discord before 4:30.

## 7. Judge Q&A answers
- *What if they lie about country / use a VPN?* "We use IP for country, cross-check signals, and when they disagree apply the stricter rules, so lying never unlocks anything."
- *How do cards physically move?* "Kids never meet up: cards travel by tracked mail. That's on our roadmap."
- *Why FastSpring for a marketplace?* "Trades are card-for-card. Kardza sells digital items and protection through FastSpring; user-to-user payouts come later."
- *Can AI prove a card is real?* "No. It flags anything that looks off. A photo can't prove authenticity."
- *Do parents read kids' chats?* "No. They get alerts with the reason, never the conversation."
