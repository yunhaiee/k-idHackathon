// Demo-layer helpers. Fields the server doesn't store yet (cash on offers, credibility) are read defensively,
// so the UI lights up as soon as NOTES_FOR_YUNHA.md lands, without touching types.ts.
import type { Policy } from './policy';
import type { SeedUser } from './seed';
import type { Offer, User } from './types';

/** Kardza Intelligence result for one offer: `analyzeOffer()` on the server (NOTES_FOR_YUNHA.md, R3). */
export type OfferAnalysis = {
  fairness: { fair: boolean; marketValue: number; gap: number; message: string };
  risks: { type: string; evidence: string }[];
  riskLevel: 'none' | 'low' | 'high';
  redactedTranscript?: string;
  reasonForParent?: string;
  checkedBy?: string[];
};

export type DemoOffer = Offer & {
  cashUsd?: number;
  counterUsd?: number;
  parentApproved?: boolean;
  analysis?: OfferAnalysis;
};

export const cashOf = (o: Offer) => (o as DemoOffer).cashUsd ?? 0;
export const analysisOf = (o: Offer) => (o as DemoOffer).analysis;
export const credibilityOf = (u: User) => (u as SeedUser).credibility;
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

export const FLAG: Record<string, string> = { US: '🇺🇸', DE: '🇩🇪', GB: '🇬🇧', KR: '🇰🇷' };
