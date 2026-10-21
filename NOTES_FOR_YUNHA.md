# Notes for Yunha (from Oliver, branch `oliver-demo`)

New demo: **Maya 14 🇺🇸 · Leo 14 🇩🇪 · Anna (Leo's mom) · Devon 25 🇺🇸**, shown side by side at **`/demo`**.
I only touched UI, copy, seed and M5 files. Everything below that needs your files is written as the exact change.

## Round 2: every demo step is a real user action

Oliver's ask: no simulate button. Devon records a real voice note on the listing page, and policy decides delivery.
The UI for all of it is on `oliver-demo`. The server pieces below are yours. **⛔ = blocks the demo.**

### R2. Voice check: 8s Modulate timeout, AI transcript fallback (`src/server/modulate.ts`, `src/app/api/voice+api.ts`)

Status: Modulate works live today (2–6s). Missing: the 8s cap, and a fallback for a **recorded** note
(today a failed recording becomes `"We couldn't check this voice note"`; only the sample has a canned transcript). Not ⛔ while Modulate is up.

`modulate.ts`: let the caller set the timeout.
```ts
export function transcribe(audio: Buffer, filename: string, timeoutMs = 8000) {
  return post<STT>('velma-2-stt-batch', form(audio, modulateName(filename), { emotion_signal: 'true', deepfake_signal: 'true', pii_phi_tagging: 'true' }), timeoutMs);
}
```
`voice+api.ts`, in the `catch` after `transcribe(...)`: Gemini can take audio (Claude can't), so transcribe with it, and label the result:
```ts
} catch (e) {
  console.warn('[voice] Modulate failed:', String(e).slice(0, 200));
  checkedBy.push('simulated'); // UI shows "(voice check simulated)"
  try {
    const mime = filename.endsWith('.webm') ? 'audio/webm' : 'audio/mp4';
    const { data, model } = await geminiJSON<{ transcript: string }>(
      [{ inline_data: { mime_type: mime, data: audio.toString('base64') } }, { text: 'Transcribe this voice note word for word. Wrap any phone number in <pii:phone>…</pii:phone>.' }],
      { type: 'OBJECT', properties: { transcript: { type: 'STRING' } }, required: ['transcript'] },
    );
    tagged = data.transcript;
    checkedBy.push(model);
  } catch {
    tagged = isSample ? SIMULATED_SAMPLE : '';
  }
}
```
The UI reads `checkedBy`: `Modulate` → "Kardza Intelligence · checked by Modulate + AI"; `simulated` adds "(voice check simulated)".

Also check: the browser records **webm/opus** (Chrome) or **mp4** (Safari). `modulateName` only renames `.m4a`. Please confirm Modulate accepts `.webm`; if not, I can force `audio/mp4` where the browser supports it.

### R3. ⛔ Kardza Intelligence: `analyzeOffer()` (new `src/server/intelligence.ts`, called from `voice+api.ts` and `message+api.ts`)

Blocks the demo's "AI checked the offer" line, `[Let Leo see it]` evidence, and the parent reason. The UI already reads
`offer.analysis` (type `OfferAnalysis` in `src/lib/demo.ts`) and falls back to today's `message.risk` when it's missing.

```ts
/// <reference types="node" />
// Kardza Intelligence: fairness + safety for one offer. Rules first (never miss the obvious), then Claude → Gemini
// can only ADD risks or raise the level. Fairness is arithmetic; the AI only words it.
import type { User } from '@/lib/types';
import { aiJSON } from './ai';

export type Risk = { type: string; evidence: string };
export type OfferAnalysis = {
  fairness: { fair: boolean; marketValue: number; gap: number; message: string };
  risks: Risk[];
  riskLevel: 'none' | 'low' | 'high';
  redactedTranscript?: string;
  reasonForParent?: string;
  checkedBy: string[];
};

const PRE: { type: string; re: RegExp }[] = [
  { type: 'off_platform_contact', re: /(\+?\d[\d\s().-]{6,}\d)|\b(five|six|seven|eight|nine|zero|one|two|three|four)(\s+(five|six|seven|eight|nine|zero|one|two|three|four)){5,}\b|<pii:phone>.*?<\/pii:phone>/i },
  { type: 'off_platform_contact', re: /\b(text|dm|message|call|snap|add)\s+me\b|whats\s?app|discord|snapchat|insta(gram)?|telegram|(^|\s)@[a-z0-9_.]{3,}/i },
  { type: 'pii', re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  { type: 'secrecy', re: /\b(don'?t|do not)\s+tell\b|\bour secret\b|\bkeep (it|this) (a )?secret\b/i },
  { type: 'meet_in_person', re: /\bmeet\b|\bafter school\b|\bcome over\b|\bpick (it|you) up\b/i },
  { type: 'pressure', re: /\bhurry\b|\bright now\b|\boffer ends\b|\btonight\b|\blast chance\b|\btrust me\b/i },
  { type: 'payment_outside', re: /\b(gift ?card|venmo|cash ?app|paypal|zelle)\b/i },
];

export function preCheck(text: string): Risk[] {
  const out: Risk[] = [];
  for (const { type, re } of PRE) {
    const m = text.match(re);
    if (m && !out.some((r) => r.type === type)) out.push({ type, evidence: m[0].replace(/<\/?pii:\w+>/g, '').trim() });
  }
  return out;
}

export const redactBlocks = (t: string) =>
  t.replace(/<pii:\w+>.*?<\/pii:\w+>/gi, '▇▇▇-▇▇▇▇')
   .replace(/(\+?\d[\d\s().-]{6,}\d)/g, '▇▇▇-▇▇▇▇')
   .replace(/\b(five|six|seven|eight|nine|zero|one|two|three|four)(\s+(five|six|seven|eight|nine|zero|one|two|three|four)){5,}\b/gi, '▇▇▇-▇▇▇▇')
   .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '▇▇▇@▇▇▇');

export async function analyzeOffer(input: {
  amount: number;            // cash + offered card value
  marketValue: number;       // listing card price
  transcript?: string;       // Modulate-tagged
  voiceSignals?: { deepfake?: number; emotions?: string[]; behaviors?: string[] };
  sender: User;
  recipient: User & { pronoun?: string };
}): Promise<OfferAnalysis> {
  const { amount, marketValue, transcript = '' } = input;
  const gap = Math.max(0, Math.round(marketValue - amount));
  const fair = marketValue ? amount / marketValue >= 0.7 : true;
  const risks = preCheck(transcript);
  if ((input.voiceSignals?.deepfake ?? 0) > 0.85) risks.push({ type: 'synthetic_voice', evidence: `${Math.round(input.voiceSignals!.deepfake! * 100)}% synthetic` });
  const checkedBy = ['rules'];
  let reasonForParent = risks.some((r) => r.type === 'off_platform_contact')
    ? `asking ${input.recipient.pronoun ?? 'them'} to text a phone number`
    : risks.length ? 'that broke our safety rules' : undefined;

  if (transcript) {
    try {
      const ai = await aiJSON<{ risks: Risk[]; reasonForParent: string }>(
        {
          text: `You check messages on a trading-card marketplace used by kids. Sender: ${input.sender.name}. Recipient is a minor.
List every risk as {type, evidence} with type one of off_platform_contact, pii, pressure, secrecy, meet_in_person, payment_outside,
and evidence = the exact words. Then reasonForParent: a short clause that finishes "${input.sender.name} sent ${input.recipient.name} a voice note …",
e.g. "asking ${input.recipient.pronoun ?? 'them'} to text a phone number". Never quote a phone number.
Message: """${transcript.slice(0, 1500)}"""`,
        },
        {
          type: 'object',
          properties: {
            risks: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, evidence: { type: 'string' } }, required: ['type', 'evidence'], additionalProperties: false } },
            reasonForParent: { type: 'string' },
          },
          required: ['risks', 'reasonForParent'],
          additionalProperties: false,
        },
      );
      checkedBy.push(ai.model);
      for (const r of ai.data.risks) if (!risks.some((x) => x.type === r.type)) risks.push({ type: r.type, evidence: redactBlocks(r.evidence) });
      if (ai.data.reasonForParent) reasonForParent = ai.data.reasonForParent;
    } catch (e) {
      console.warn('[intel] AI skipped, rules only:', String(e).slice(0, 120));
    }
  }

  const high = risks.some((r) => r.type !== 'synthetic_voice');
  return {
    fairness: {
      fair,
      marketValue: Math.round(marketValue),
      gap,
      message: fair ? 'This trade looks fair.' : `This trade isn't fair. Your card is worth about $${Math.round(marketValue)}.`,
    },
    risks: risks.map((r) => ({ ...r, evidence: redactBlocks(r.evidence) })),
    riskLevel: high ? 'high' : risks.length ? 'low' : 'none',
    redactedTranscript: transcript ? redactBlocks(transcript) : undefined,
    reasonForParent,
    checkedBy,
  };
}
```

Wire it in `voice+api.ts` after the transcript, before `mutate`:
```ts
const pre = await readDB();
const offer = pre.offers.find((o) => o.id === offerId)!;
const { want, give } = offerValues(pre, offer);
const analysis = await analyzeOffer({
  amount: give, marketValue: want, transcript: tagged,
  voiceSignals: { deepfake, emotions },
  sender: pre.users[fromId], recipient: pre.users[offer.toId === fromId ? offer.fromId : offer.toId],
});
// keep msg.risk for old screens; the UI prefers offer.analysis
msg.risk = { level: analysis.riskLevel, reasons: analysis.risks.map((r) => r.type) };
msg.redacted = analysis.redactedTranscript ?? msg.redacted;
const db = await mutate((d) => {
  const o = d.offers.find((x) => x.id === offerId);
  if (o) (o as Offer & { analysis?: OfferAnalysis }).analysis = analysis;
  deliverMessage(d, msg);
});
```
And the same `analyzeOffer` (no transcript) in `createOffer`'s route, so the fairness verdict exists before any voice note. Add `analysis?: OfferAnalysis` to `Offer` in `types.ts`.
Note `msg.risk.reasons` becomes risk **types**; MessageView only shows reasons to adults, so that's fine, or keep `ruleCheck` reasons there.

## Round 1 audit: does each demo step work? (tested on my laptop, `localhost:8082`, real k-ID + live Modulate)

| # | Step | Status | What's true today |
|---|---|---|---|
| 1 | Seed: two Charizards ~$70 "Priced by AI", $4.99 Holo Binder Theme | ✅ | In `seed.ts`. FastSpring's product is still $2.99 in the dashboard (see 8). |
| 2 | Devon offers $20 + voice note on both Charizards, one action | ⚠️ | `/demo` "send to both" works (2× `createOffer` + 2× sample voice). **The $20 isn't stored**: `Offer` has no cash, so it shows as $0. Live recording is per offer only (Inbox). |
| 3 | Modulate flags the voice note; AI says $20 vs $70 is unfair | ⚠️ | Modulate ✅ live: phone number, "don't tell your mom", meet-up, AI-voice 97%, Velma "Child Safety Violation". Fairness is the value ratio, not an AI call, and sees $0 (no cash). |
| 4 | Maya: "This trade isn't fair. Your card is worth about $70." + scam banner, can play | ⚠️ | Copy + banner ✅. **Play needs Maya to switch on Voice notes in k-ID Settings first**: real k-ID gives her `voice-chat` off, player-managed. Until then she reads the redacted transcript. |
| 5 | Leo: nothing but "A message was hidden… We told your parent." + k-ID "Why am I seeing this?" | ⚠️ | Looks right ✅ (UI hides it via policy). **Server still delivers the offer to Leo** (`status: pending`, `toId: leo`); only the UI holds it back. |
| 6 | Anna: alert [Block Devon] [Dismiss] + offer review [Decline] [Approve]; never sees audio/chat | ⚠️ | Alert copy ✅, Dismiss ✅, review copy ✅, no audio ✅. **Block isn't stored** (device only). Review shows $0 (no cash). Approve is two taps (it accepts on Leo's behalf, then the trade request). |
| 7 | Devon: "Sharing contact info isn't allowed. −5 credibility." 62 → 57 live, on offer cards + profile | ⚠️ | Copy ✅, credibility 62 shown on cards + Me ✅. **Nothing lowers it**: no server logic. |
| 8 | Maya counters $65 → Devon accepts → "Deal agreed." | ❌ | No counter action. Also: **real k-ID makes Maya's trading guardian-managed** (`virtual-property-ownership` GUARDIAN at 14 in the US), but she has no parent on file, so the server lets her accept anyway. "Deal agreed." copy is in. |
| 9 | Maya buys $4.99 theme; Leo "Ask a parent" → Anna "Leo wants the Holo Binder Theme ($4.99)" → Approve and pay → Leo owns it | ✅ | Both paths work end to end on the labeled **simulated** FastSpring checkout (API still blocked). |
| 10 | Reset restores everything | ✅ | Offers, messages, alerts, purchases → 0; Devon back to 62; k-ID sessions kept. `/demo` reset also reloads every phone. |

**Blocking all of the above on your laptop:** `PersonaId` (step 0 below). Until it's widened, my seed casts the new ids.

**Before the demo (no code):** Leo 14 in Germany needs a real parent consent email (consent age 16): pick Anna's inbox and approve once; Reset keeps it. I used "Use simulated rules" for Leo locally. Maya: switch on **Voice notes** (and **Messages**, for the counter) in k-ID Settings.

---

## Changes needed in your files (demo-flow order)

### 0. `src/lib/types.ts` (shared): new personas, cash, credibility, counter

```ts
export type PersonaId = 'maya' | 'leo' | 'anna' | 'devon';

export type User = {
  // …existing fields
  /** Trust score shown on offers; lowered when a message is blocked. */
  credibility?: number;
  /** Players this account (or their parent) blocked. */
  blocked?: PersonaId[];
};

export type Offer = {
  // …existing fields
  cashUsd?: number;
  /** Receiver's counter, in cash. */
  counterUsd?: number;
  status: 'pending' | 'needs-parent' | 'countered' | 'accepted' | 'declined';
  /** A parent reviewed this offer before it reached their child. */
  parentApproved?: boolean;
};
```

Then I'll drop the `as PersonaId` cast in `seed.ts` and the defensive reads in `src/lib/demo.ts`.

### 0b. Step 1: keep the two demo Charizards at ~$70 after your TCGplayer refresh (`src/server/prices.ts`)

Your `82873e9` (on `main`, not on my branch yet) makes Reset overwrite every card's price by `name|number`. The real price of Base Set Charizard 4/102 is far above $70, so the $20-vs-$70 story breaks. Once you widen `Card` with `priceSource`, I'll seed the two Charizards with `priceSource: 'AI estimate'` (that's the "Priced by AI" label). Please skip those in `applyPrices`:
```ts
for (const card of db.cards) {
  if (card.priceSource === 'AI estimate') continue; // demo cards priced by the AI price check
  const hit = db.priceCache[`${card.name}|${card.number}`];
  // …
}
```
(Then `AI_PRICED_CARD_IDS` in `seed.ts` goes away.)

### 1. Step 2–3: store cash on offers (`src/server/trade.ts`, `src/app/api/state+api.ts`)

`state+api.ts`, the `createOffer` action:
```ts
| { action: 'createOffer'; listingId: string; fromId: PersonaId; offeredCardIds: string[]; cashUsd?: number }
…
case 'createOffer':
  return Response.json(await mutate((db) => void createOffer(db, body.listingId, body.fromId, body.offeredCardIds, body.cashUsd)));
```

`trade.ts`:
```ts
export function offerValues(db: DB, offer: Offer) {
  const listing = db.listings.find((l) => l.id === offer.listingId);
  const want = listing ? cardValue(db, [listing.cardId]) : 0;
  const give = cardValue(db, offer.offeredCardIds) + (offer.cashUsd ?? 0);
  return { want, give, ratio: want ? give / want : 1 };
}

export function createOffer(db: DB, listingId: string, fromId: PersonaId, offeredCardIds: string[], cashUsd?: number) {
  // …
  const offer: Offer = { /* … */ offeredCardIds, cashUsd: cashUsd && cashUsd > 0 ? Math.round(cashUsd) : undefined, /* … */ };
```

The `/demo` button already sends `cashUsd: 20`. The fair check, Anna's review and the offer cards all read it.

(Optional, for "checked by AI": in `createOffer` keep the ratio as the decision, and add an `aiJSON` one-liner verdict as `offer.fairnessNote` if you have time. The UI doesn't need it.)

### 2. Step 5–6: hold offers to parent-managed kids for the parent (`trade.ts`, `state+api.ts`)

Today the offer reaches Leo and the UI hides it. On the server, in `createOffer`, after `db.offers.unshift(offer)`:
```ts
const toPol = getPolicy(to);
if (toPol.tradeNeedsParent && toPol.access['text-chat-private'] === 'parent' && to.parentId) {
  offer.status = 'needs-parent'; // the child never gets it until the parent approves
}
```
Also drop the old "unfair offer" alert for this case (Anna's review says it).

New action `parentReviewOffer`:
```ts
| { action: 'parentReviewOffer'; offerId: string; by: PersonaId; approve: boolean }
…
case 'parentReviewOffer':
  return Response.json(await mutate((db) => {
    const o = db.offers.find((x) => x.id === body.offerId);
    if (!o || db.users[o.toId].parentId !== body.by) throw new Error('not your child');
    if (body.approve) { o.status = 'pending'; o.parentApproved = true; } else o.status = 'declined';
  }));
```
In `respondOffer`, skip the second parent step when `offer.parentApproved`.
**Tell me when it's in.** I'll switch Anna's [Decline]/[Approve] to `parentReviewOffer` and read `needs-parent` offers (two lines in `parent.tsx`).

### 3. Step 6: Block Devon (`state+api.ts`, `trade.ts`)

```ts
| { action: 'block'; by: PersonaId; childId: PersonaId; blockedId: PersonaId }
…
case 'block':
  return Response.json(await mutate((db) => {
    const child = db.users[body.childId];
    if (child.parentId !== body.by) throw new Error('not your child');
    child.blocked = [...new Set([...(child.blocked ?? []), body.blockedId])];
    db.offers.filter((o) => o.toId === child.id && o.fromId === body.blockedId && o.status !== 'accepted')
      .forEach((o) => (o.status = 'declined'));
  }));
```
Then reject in `createOffer` and `deliverMessage` when `db.users[toId].blocked?.includes(fromId)`.

### 4. Step 7: credibility −5 on a blocked message (`trade.ts`)

In `deliverMessage`, right after `db.messages.push(msg)`:
```ts
if (msg.risk?.level === 'high') {
  const from = db.users[msg.fromId];
  if (from.credibility != null) from.credibility = Math.max(0, from.credibility - 5);
}
```
"Send to both" sends two voice notes, so this drops Devon **62 → 52**. For 62 → 57, charge once per offer batch, e.g. only when the sender has no earlier high-risk message in the last minute:
```ts
const recent = db.messages.some((m) => m.id !== msg.id && m.fromId === msg.fromId && m.risk?.level === 'high' && msg.createdAt - m.createdAt < 60_000);
if (!recent) from.credibility = Math.max(0, (from.credibility ?? 0) - 5);
```
The seed sets 62; Reset restores it. The UI already shows the live value on offer cards and Devon's Me tab.

### 5. Step 8: counteroffer → deal (`trade.ts`, `state+api.ts`)

```ts
| { action: 'counterOffer'; offerId: string; by: PersonaId; cashUsd: number }
…
case 'counterOffer':
  return Response.json(await mutate((db) => {
    const o = db.offers.find((x) => x.id === body.offerId);
    if (!o || o.toId !== body.by || o.status !== 'pending') throw new Error('not your offer');
    o.counterUsd = Math.round(body.cashUsd);
    o.status = 'countered';
  }));
```
And in `respondOffer`, let the **original sender** accept a counter:
```ts
if (offer.status === 'countered' && offer.fromId === by) {
  if (!accept) { offer.status = 'declined'; return; }
  offer.cashUsd = offer.counterUsd;
  offer.status = 'accepted'; // "Deal agreed." No cards move, no payment (demo)
  return;
}
```
**Tell me when it's in.** I'll add the "Counter at $65" control (Maya) and the "Accept" on the counter (Devon) in `OfferThread.tsx`.

**Decision for you (k-ID):** real k-ID says Maya's trading is **guardian-managed**, so with `tradeNeedsParent` true she shouldn't be able to accept or counter on her own. Either (a) before the demo she asks for "Trading cards" in k-ID Settings and any guardian inbox approves it (like Jordan before), or (b) we accept that her account has no parent and let the server allow it, as it does today. (a) is the honest one.

### 6. Step 9: FastSpring

Change `holo-binder-theme` to **$4.99** in the FastSpring dashboard (TASKS.md lists $2.99). Nothing else; both purchase paths work.

### 7. M5: k-ID declare (`src/components/kid/KidRoot.tsx`)

```ts
const DECLARE = {
  permissions: KID_PERMISSIONS.map((name) => ({ name })),
  supportEmail: 'yunhalee@stanford.edu',
  iconUrl: '/icon.png', // now the Kardza logo
  privacyPolicyUrl: 'https://c-yunhaiee-etcpa2-mvifhw22s8xpmnaa.on.expo.app/privacy',
  termsOfServiceUrl: 'https://c-yunhaiee-etcpa2-mvifhw22s8xpmnaa.on.expo.app/terms',
};
```
`/privacy` and `/terms` are public (outside the k-ID gate). The privacy page names Claude, Gemini, Modulate and FastSpring and what each gets: check it matches what the server really sends.

### 8. Small things

- `src/lib/device.tsx`: if a browser remembers an old persona (`jordan`/`mom`), every screen crashes on `db.users[persona]`. Fall back to `'maya'` when the stored id isn't in `db.users`. (I guarded `TopBar` only.)
- Velma's findings are still appended to `alert.reason`, but Anna's alert now shows the script's sentence (built from the message's risk reasons in `src/lib/copy.ts`), so Velma isn't visible to her. Say if you want a muted "Modulate Velma: …" line under it.
- `npx expo lint` installs ESLint into `package.json` the first time. I reverted that. The 7 existing lint errors (unescaped `'`, `device.tsx` setState in effect) are in files I didn't change.

---

## What I changed (branch `oliver-demo`)

| File | Change |
|---|---|
| `src/lib/seed.ts` | New personas, cards, $4.99 theme, credibility 62, `DEMO` script + `PERSONA_ORDER` |
| `src/lib/copy.ts` (new) | All demo copy |
| `src/lib/demo.ts` (new) | Defensive reads for cash/credibility, `heldForParent(policy)`, flags |
| `src/app/demo.tsx` (new) | `/demo`: three phones + presenter controls |
| `src/components/DemoControls.tsx` (new) | Send to both + Reset demo |
| `src/components/WhyChip.tsx` (new) | k-ID "Why am I seeing this?" |
| `src/components/trade/OfferThread.tsx`, `MessageView.tsx`, `FairMeter.tsx` | Per-policy views from the script |
| `src/app/(tabs)/parent.tsx`, `shop.tsx`, `index.tsx`, `_layout.tsx`, `src/app/listing/[id].tsx`, `src/components/TopBar.tsx` | Parent review/alert/purchase copy, Priced by AI, personas from data (no hardcoded `'mom'`) |
| `src/app/privacy.tsx`, `src/app/terms.tsx`, `src/components/Legal.tsx` (new) | M5 legal pages |
| `src/app/+html.tsx` (new), `public/manifest.json` (new), icons | M5 PWA: standalone, `#0A0A0F`, Kardza logo icon |
