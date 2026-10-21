// Every line of demo copy in one place. Templates take names, prices and k-ID policy facts, never persona ids,
// so the same words come out for whoever k-ID puts in that situation.
import type { Band } from './policy';

const usd = (n: number) => `$${Math.round(n)}`;
const usd2 = (n: number) => `$${n.toFixed(2)}`;

export const BAND_WORD: Record<Band, string> = { kid: 'kid', teen: 'teen', adult: 'adult' };

/** Credibility tiers shown next to a trader's score. */
export function credibilityLabel(score: number) {
  if (score >= 80) return 'Trusted';
  if (score >= 50) return 'Building trust';
  return 'Low trust';
}

/** Same three tiers as the label: green, amber, red. */
export const credibilityTone = (score: number) => (score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'danger') as 'ok' | 'warn' | 'danger';

/**
 * What the blocked voice note asked for, in a parent's words, from the server's risk reasons
 * (e.g. "Shares a phone number", "Asks to keep a secret from a parent", "Asks to meet in person").
 * Finishes the sentence "Devon (adult) sent Leo a voice note …. We blocked it."
 */
function alertAsk(reasons: string[], pronoun: string): string {
  // TODO(human): pick the phrase for the riskiest reason(s); the script wants "asking him to text a phone number".
  return reasons.some((r) => /phone|move off/i.test(r)) ? `asking ${pronoun} to text a phone number` : 'that broke our safety rules';
}

export const COPY = {
  market: {
    aiPriced: 'Priced by AI',
    requested: '✓ Requested',
    approvedByParent: '✓ Trading approved by parent',
    marketPriced: 'TCGplayer price',
    collection: 'Your collection',
    cardCount: (n: number) => `${n} card${n === 1 ? '' : 's'} in your binder`,
    binder: 'Your binder',
    countered: 'Countered',
    parentChecks: 'A grown-up checks every trade',
    parentChecksBody: 'Your parent sees each trade before it happens.',
    guardianOptIn: 'Trading needs a one-time OK in k-ID',
    guardianOptInBody: 'k-ID asks a guardian once before you can trade. Ask from k-ID settings.',
  },

  offer: {
    make: 'Make offer',
    addCards: 'Add cards from your binder (optional)',
    alsoSimilar: (n: number, card: string) => `Also send to ${n} similar ${card} listing${n === 1 ? '' : 's'}`,
    send: 'Send offer',
    sending: 'Sending offer…',
    needAmount: 'Enter an amount or pick a card first.',
    notSaved: 'the server did not return the new offer',
    stepSave: "Couldn't save the offer",
    stepVoice: "Couldn't send the voice note",
    stepMessage: "Couldn't send the message",
    checkingMessage: 'Checking message…',
    messagePlaceholder: 'Add a message (optional)',
    stepDeliver: "Couldn't refresh the inbox",
    newOffer: (sender: string, card: string) => `New offer from ${sender} on your ${card}`,
  },

  thread: {
    show: (kind: 'text' | 'voice') => (kind === 'voice' ? 'Show voice note' : 'Show message'),
    hide: 'Hide',
    flagged: 'Flagged',
  },

  sent: {
    title: (n: number) => (n > 1 ? `${n} offers sent` : 'Offer sent'),
    dismiss: 'Dismiss',
    checked: 'Kardza Intelligence checked it before delivery.',
    flagged: (kind: 'text' | 'voice', delta: number) =>
      `Kardza Intelligence flagged your ${kind === 'voice' ? 'voice note' : 'message'}: sharing contact info isn't allowed (−${delta} credibility).`,
    you: 'Sent',
  },

  notify: {
    voice: (sender: string, kind: 'text' | 'voice') => `New ${kind === 'voice' ? 'voice note' : 'message'} from ${sender}`,
    counter: (who: string, amount: number) => `${who} countered at ${usd(amount)}`,
    deal: (who: string) => `Deal agreed with ${who}`,
    alert: (child: string) => `Safety alert about ${child}`,
    tradeAsk: (child: string) => `${child} wants to accept a trade`,
    owned: (product: string) => `You got the ${product}`,
    released: (sender: string, risky: boolean) => `Your parent let ${sender}'s offer through.${risky ? ' Be careful.' : ''}`,
    enable: 'Phone notifications',
  },

  intel: {
    name: 'Kardza Intelligence',
    /** Which services checked it: Modulate for voice, the AI model for text and fairness. */
    checkedBy: (who: string[]) => `checked by ${who.map((w) => (/claude|gemini|opus|sonnet/i.test(w) ? 'AI' : w)).join(' + ')}`,
  },

  fair: {
    unfairTitle: "This trade isn't fair.",
    unfairBody: (worth: number) => `Your card is worth ${usd2(worth)}.`,
    fairTitle: 'This trade looks fair.',
  },

  voice: {
    /** Teen receiver, risky voice note: delivered and playable, with this banner on top. */
    scamBanner: "⚠️ This message asks you to move off Kardza. That's a common scam. Never share your number.",
    play: '▶ Play voice note',
    pause: '❚❚ Pause',
    hold: '🎤 Hold to record (or tap)',
    stopHint: 'Release or tap to stop',
    short: 'That was too short. Hold to record, or tap once to start and again to stop.',
    asking: 'Allow the microphone, then hold to record.',
    ready: 'Mic ready. Hold to record (up to 15s).',
    denied: "Microphone blocked. Use the sample voice note, or allow the mic in your browser's site settings.",
    recorded: (len: string) => `Voice note · ${len}`,
    sampleAttached: 'Sample voice note attached',
    sample: 'Use sample voice note',
    remove: 'Remove',
    /** Compact recorder inside the message box. */
    holdShort: 'Hold to record',
    askingShort: 'Allow the mic…',
    shortShort: 'Too short, hold longer',
    deniedShort: 'Mic blocked',
    playShort: (len: string) => `Play ${len}`,
    checking: 'Checking voice note…',
    simulated: '(voice check simulated)',
    offHint: 'Voice notes are off for you. k-ID lets you turn them on yourself.',
    turnOn: 'Turn on voice notes (k-ID)',
    /** Receiver whose parent decides (kid band): nothing arrives but this. */
    hidden: 'A message was hidden for your safety. We told your parent.',
    /** Same receiver, offer with nothing risky in it: it waits for the parent. */
    held: "An offer is waiting for your parent's OK.",
  },

  kidRules: {
    title: (child: string) => `What k-ID decided for ${child}`,
    who: (child: string, age: number, where: string, consentAge?: number) =>
      `${child} · ${age} · ${where}${consentAge ? ` · consent age ${consentAge}` : ''}`,
    access: (a: 'on' | 'optin' | 'parent' | 'off', child: string) =>
      a === 'parent' ? 'Needs you' : a === 'on' ? 'Allowed' : a === 'optin' ? `${child} can turn on` : 'Not available',
    credibility: (child: string, tier: string) => `${child}'s credibility · ${tier}`,
  },

  why: {
    chip: 'Why am I seeing this?',
    source: 'Rules from k-ID',
    body: (name: string, age: number, countryName: string, consentAge?: number) =>
      consentAge
        ? `${name} is ${age} in ${countryName}. Under ${consentAge}, a parent must approve purchases, trades and messages from strangers.`
        : `${name} is ${age} in ${countryName}. A parent approves purchases, trades and messages from strangers.`,
  },

  sender: {
    /** The sender of a blocked message, with the credibility hit. */
    flagged: (delta: number) => `Sharing contact info isn't allowed. −${delta} credibility.`,
    credibility: (score: number) => `Credibility ${score} · ${credibilityLabel(score)}`,
    credibilityTitle: 'Credibility',
    credibilityHow: 'Fair trades raise it. Blocked messages (like sharing contact info) cost 5.',
  },

  parent: {
    alertTitle: (child: string) => `About ${child}`,
    /** Built from the message's risk reasons; the parent never sees the audio or the chat. */
    /** `reason` is analyzeOffer's reasonForParent when the server has it, else built from the risk reasons. */
    voiceAlert: (
      sender: string,
      band: Band,
      child: string,
      reasons: string[],
      pronoun: string,
      reason?: string,
      kind: 'text' | 'voice' = 'voice',
    ) =>
      `${sender} (${BAND_WORD[band]}) sent ${child} a ${kind === 'voice' ? 'voice note' : 'message'} ${reason ?? alertAsk(reasons, pronoun)}. We blocked it.`,
    letSee: (child: string) => `Let ${child} see it`,
    released: (child: string) => `${child} can see it now, with a scam warning. You approve any trade.`,
    blocked: (sender: string, child: string) => `${sender} can't contact ${child} again.`,
    needsServer: 'This needs the server update (NOTES_FOR_YUNHA.md).',
    block: (sender: string) => `Block ${sender}`,
    dismiss: 'Dismiss',
    offerReview: (sender: string, band: Band, child: string, offered: number, card: string, worth: number) =>
      `${sender} (${BAND_WORD[band]}) offered ${usd(offered)} for ${child}'s ${card}. It's worth ${usd2(worth)}.`,
    approve: 'Approve',
    decline: 'Decline',
    purchaseAsk: (child: string, product: string, price: number) => `${child} wants the ${product} (${usd2(price)})`,
    approveAndPay: 'Approve and pay',
    neverChat: 'You see the reason, never the conversation.',
  },

  deal: {
    counter: 'Counter',
    reply: 'Reply',
    counterAt: (amount: number) => `Counter at ${usd(amount)}`,
    waiting: (amount: number, who: string) => `You countered at ${usd(amount)}. Waiting for ${who}.`,
    accept: 'Accept',
    agreed: 'Deal agreed.',
    agreedBody: 'No payment or shipping for the card in this demo.',
  },

  shop: {
    buy: (price: number) => `Buy · ${usd2(price)}`,
    askParent: 'Ask a parent',
    asked: 'Asked a parent',
    owned: 'Owned',
  },

  demo: {
    title: 'Kardza demo',
    reset: 'Reset demo',
    resetting: 'Resetting…',
    /** ··· menu fallback: sends the scripted offer + sample voice note if live recording fails on stage. */
    shortcut: 'Demo shortcut',
    sending: 'Sending…',
    hint: 'Every phone is live. ··· in any phone: Reset demo, country, Demo shortcut.',
    tagline: 'One marketplace for every age · rules from k-ID',
    live: 'Live · all phones in sync',
  },
};
