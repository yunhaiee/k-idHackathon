// Demo-layer helpers. Fields the server doesn't store yet (cash on offers, credibility) are read defensively,
// so the UI lights up as soon as NOTES_FOR_YUNHA.md lands, without touching types.ts.
import { getPolicy, type Policy } from './policy';
import type { SeedUser } from './seed';
import type { DB, Offer, User } from './types';

/** Kardza Intelligence result for one offer: `analyzeOffer()` on the server (NOTES_FOR_YUNHA.md, R3). */
export type OfferAnalysis = {
  fairness: { fair: boolean; marketValue: number; gap: number; message: string };
  risks: { type: string; evidence: string }[];
  riskLevel: 'none' | 'low' | 'high';
  redactedTranscript?: string;
  reasonForParent?: string;
  checkedBy?: string[];
};

export type DemoOffer = Omit<Offer, 'status'> & {
  /** 'countered' once the receiver counters (server: counterOffer, NOTES_FOR_YUNHA.md). */
  status: Offer['status'] | 'countered';
  cashUsd?: number;
  counterUsd?: number;
  parentApproved?: boolean;
  analysis?: OfferAnalysis;
};

export const cashOf = (o: Offer) => (o as DemoOffer).cashUsd ?? 0;
export const analysisOf = (o: Offer) => (o as DemoOffer).analysis;
export const credibilityOf = (u: User) => (u as SeedUser).credibility;
/** Who this child's parent blocked (User.blocked, set by the server's `block` action). */
export const blockedOf = (u: User) => (u as User & { blocked?: string[] }).blocked ?? [];
/** Object pronoun from the seed's people data ("asking him…"); "them" when none is set. */
export const pronounOf = (u: User) => (u as SeedUser).pronoun ?? 'them';

/** Risk types from analyzeOffer, in a short label for adults' views. */
export const RISK_LABEL: Record<string, string> = {
  off_platform_contact: 'Moves off Kardza',
  pii: 'Shares personal info',
  pressure: 'Pressure',
  secrecy: 'Asks to keep a secret',
  meet_in_person: 'Asks to meet',
  payment_outside: 'Payment outside Kardza',
  synthetic_voice: 'AI-generated voice',
};

/**
 * A receiver whose k-ID rules put a parent in charge of both trades and messages gets nothing directly:
 * the offer waits for the parent, and they only see a notice.
 */
export const heldForParent = (policy: Policy) =>
  policy.tradeNeedsParent && policy.access['text-chat-private'] === 'parent';

/**
 * Policy's `tradeNeedsParent` is true both when a parent must approve every trade (under the consent age, Leo)
 * and when k-ID only makes the trading permission guardian-managed (Maya, 14 US: a one-time OK in k-ID).
 * Until policy.ts splits these (NOTES_FOR_YUNHA.md, R7a), the UI tells them apart with the k-ID band.
 */
export const tradeNeedsParentApproval = (policy: Policy) => policy.tradeNeedsParent && policy.band === 'kid';
export const tradeNeedsGuardianOptIn = (policy: Policy) =>
  !tradeNeedsParentApproval(policy) && policy.access['virtual-property-ownership'] === 'parent';

/**
 * What happened to an offer from the sender's side, worded per the receiver's k-ID policy:
 * delivered, held for their parent's review, or declined (e.g. blocked).
 */
export function deliveryOf(db: DB, offer: Offer): { text: string; tone: 'ok' | 'warn' | 'danger' } {
  const to = db.users[offer.toId];
  const parent = to.parentId ? db.users[to.parentId]?.name : undefined;
  if (offer.status === 'declined') return { text: `${to.name} declined`, tone: 'danger' };
  if (offer.status === 'accepted') return { text: 'Deal agreed', tone: 'ok' };
  if (heldForParent(getPolicy(to)) && !(offer as DemoOffer).parentApproved)
    return { text: `Held for ${parent ?? 'a parent'}'s review`, tone: 'warn' };
  return { text: `Delivered to ${to.name}`, tone: 'ok' };
}

export const FLAG: Record<string, string> = { US: '🇺🇸', DE: '🇩🇪', GB: '🇬🇧', KR: '🇰🇷' };
