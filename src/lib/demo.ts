// Demo-layer helpers. Fields the server doesn't store yet (cash on offers, credibility) are read defensively,
// so the UI lights up as soon as NOTES_FOR_YUNHA.md lands, without touching types.ts.
import type { Policy } from './policy';
import type { SeedUser } from './seed';
import type { Offer, User } from './types';

export type DemoOffer = Offer & { cashUsd?: number };

export const cashOf = (o: Offer) => (o as DemoOffer).cashUsd ?? 0;
export const credibilityOf = (u: User) => (u as SeedUser).credibility;

/**
 * A receiver whose k-ID rules put a parent in charge of both trades and messages gets nothing directly:
 * the offer waits for the parent, and they only see a notice.
 */
export const heldForParent = (policy: Policy) =>
  policy.tradeNeedsParent && policy.access['text-chat-private'] === 'parent';

export const FLAG: Record<string, string> = { US: '🇺🇸', DE: '🇩🇪', GB: '🇬🇧', KR: '🇰🇷' };
