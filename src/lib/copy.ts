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
  return 'New or low trust';
}

/**
 * What the blocked voice note asked for, in a parent's words, from the server's risk reasons
 * (e.g. "Shares a phone number", "Asks to keep a secret from a parent", "Asks to meet in person").
 * Finishes the sentence "Devon (adult) sent Leo a voice note …. We blocked it."
 */
function alertAsk(reasons: string[]): string {
  // TODO(human): pick the phrase for the riskiest reason(s); the script wants "asking them to text a phone number".
  return reasons.some((r) => /phone|move off/i.test(r)) ? 'asking them to text a phone number' : 'that broke our safety rules';
}

export const COPY = {
  market: {
    aiPriced: 'Priced by AI',
  },

  offer: {
    make: 'Make offer',
    addCards: 'Add cards from your binder (optional)',
    alsoSimilar: (n: number, card: string) => `Also send to ${n} similar ${card} listing${n === 1 ? '' : 's'}`,
    send: 'Send offer',
    sending: 'Sending offer…',
    newOffer: (sender: string, card: string) => `New offer from ${sender} on your ${card}`,
  },

  fair: {
    unfairTitle: "This trade isn't fair.",
    unfairBody: (worth: number) => `Your card is worth about ${usd(worth)}.`,
    fairTitle: 'This trade looks fair.',
  },

  voice: {
    /** Teen receiver, risky voice note: delivered and playable, with this banner on top. */
    scamBanner: "⚠️ This message asks you to move off Kardza. That's a common scam. Never share your number.",
    play: '▶ Play voice note',
    pause: '❚❚ Pause',
    hold: '🎤 Hold to record',
    asking: 'Allow the microphone, then hold to record.',
    ready: 'Mic ready. Hold to record (up to 15s).',
    denied: "Microphone blocked. Use the sample voice note, or allow the mic in your browser's site settings.",
    recorded: (len: string) => `Voice note · ${len}`,
    sampleAttached: 'Sample voice note attached',
    sample: 'Use sample voice note',
    remove: 'Remove',
    checking: 'Checking voice note…',
    simulated: '(voice check simulated)',
    offHint: 'Voice notes are off for you. Turn them on in k-ID settings to play them.',
    /** Receiver whose parent decides (kid band): nothing arrives but this. */
    hidden: 'A message was hidden for your safety. We told your parent.',
    /** Same receiver, offer with nothing risky in it: it waits for the parent. */
    held: "An offer is waiting for your parent's OK.",
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
  },

  parent: {
    alertTitle: (child: string) => `About ${child}`,
    /** Built from the message's risk reasons; the parent never sees the audio or the chat. */
    voiceAlert: (sender: string, band: Band, child: string, reasons: string[]) =>
      `${sender} (${BAND_WORD[band]}) sent ${child} a voice note ${alertAsk(reasons)}. We blocked it.`,
    block: (sender: string) => `Block ${sender}`,
    dismiss: 'Dismiss',
    offerReview: (sender: string, band: Band, child: string, offered: number, card: string, worth: number) =>
      `${sender} (${BAND_WORD[band]}) offered ${usd(offered)} for ${child}'s ${card}. It's worth about ${usd(worth)}.`,
    approve: 'Approve',
    decline: 'Decline',
    purchaseAsk: (child: string, product: string, price: number) => `${child} wants the ${product} (${usd2(price)})`,
    approveAndPay: 'Approve and pay',
    neverChat: 'You see the reason, never the conversation.',
  },

  deal: {
    counter: 'Counter',
    counterAt: (amount: number) => `Counter at ${usd(amount)}`,
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
  },
};
