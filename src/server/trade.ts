/// <reference types="node" />
// Trade + message rules, enforced on the server from getPolicy (k-ID session), never from the client.
import { getPolicy } from '@/lib/policy';
import type { DB, Message, Offer, PersonaId, User } from '@/lib/types';

import { uid } from './db';

/** Credibility lost when one of a sender's messages is blocked; charged once per burst (see deliverMessage). */
export const CREDIBILITY_HIT = 5;
const BURST_MS = 60_000;

export const cardValue = (db: DB, ids: string[]) =>
  ids.reduce((sum, id) => sum + (db.cards.find((c) => c.id === id)?.priceUsd ?? 0), 0);

export function offerValues(db: DB, offer: Offer) {
  const listing = db.listings.find((l) => l.id === offer.listingId);
  const want = listing ? cardValue(db, [listing.cardId]) : 0;
  const give = cardValue(db, offer.offeredCardIds) + (offer.cashUsd ?? 0);
  return { want, give, ratio: want ? give / want : 1 };
}

/** Under the digital consent age with a parent on file: the parent sees offers and risky messages first. */
const parentReviews = (to: User) => getPolicy(to).band === 'kid' && !!to.parentId;

const assertNotBlocked = (to: User, fromId: PersonaId) => {
  if (to.blocked?.includes(fromId)) throw new Error(`${to.name}'s parent blocked this account`);
};

export function createOffer(db: DB, listingId: string, fromId: PersonaId, offeredCardIds: string[], cashUsd?: number) {
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error('listing gone');
  const from = db.users[fromId];
  const fromPol = getPolicy(from);
  if (fromPol.access['virtual-property-ownership'] !== 'on')
    throw new Error('k-ID: trading is not on for this player yet');
  const to = db.users[listing.sellerId];
  assertNotBlocked(to, fromId);
  const cash = cashUsd && cashUsd > 0 ? Math.round(cashUsd) : undefined;
  const offer: Offer = {
    id: uid('o'),
    listingId,
    fromId,
    toId: listing.sellerId,
    offeredCardIds,
    cashUsd: cash,
    // A parent-reviewed child gets nothing until the parent lets it through (parentReviewOffer).
    status: parentReviews(to) ? 'held' : 'pending',
    createdAt: Date.now(),
  };
  db.offers.unshift(offer);
  return offer;
}

function completeTrade(db: DB, offer: Offer) {
  const listing = db.listings.find((l) => l.id === offer.listingId);
  if (listing) {
    const card = db.cards.find((c) => c.id === listing.cardId);
    if (card) card.ownerId = offer.fromId;
    db.listings = db.listings.filter((l) => l.id !== listing.id);
  }
  for (const id of offer.offeredCardIds) {
    const c = db.cards.find((x) => x.id === id);
    if (c) c.ownerId = offer.toId;
  }
  offer.status = 'accepted';
}

/** The child agreed; if k-ID puts a parent in charge of their trades, the parent gives the final OK. */
function agree(db: DB, offer: Offer) {
  const child = db.users[offer.toId];
  if (getPolicy(child).tradeNeedsParent && child.parentId) {
    offer.status = 'needs-parent';
    db.requests.unshift({
      id: uid('r'),
      kind: 'trade',
      childId: child.id,
      parentId: child.parentId,
      offerId: offer.id,
      status: 'pending',
      createdAt: Date.now(),
    });
    return;
  }
  completeTrade(db, offer);
}

export function respondOffer(db: DB, offerId: string, by: PersonaId, accept: boolean) {
  const offer = db.offers.find((o) => o.id === offerId);
  if (!offer) throw new Error('offer gone');
  // The original sender answers a counter: accepting it takes the counter price.
  if (offer.status === 'countered' && offer.fromId === by) {
    if (!accept) {
      offer.status = 'declined';
      return;
    }
    offer.cashUsd = offer.counterUsd;
    agree(db, offer);
    return;
  }
  if (offer.toId !== by || offer.status !== 'pending') throw new Error('not your offer');
  if (!accept) {
    offer.status = 'declined';
    return;
  }
  agree(db, offer);
}

/** Receiver counters a pending offer with a cash price; the sender then accepts or declines. */
export function counterOffer(db: DB, offerId: string, by: PersonaId, cashUsd: number) {
  const offer = db.offers.find((o) => o.id === offerId);
  if (!offer || offer.toId !== by || offer.status !== 'pending') throw new Error('not your offer');
  if (!(cashUsd > 0)) throw new Error('enter a price');
  offer.counterUsd = Math.round(cashUsd);
  offer.status = 'countered';
}

/** Parent reviews a held offer: let the child see it (with warnings), or decline it. */
export function parentReviewOffer(db: DB, offerId: string, by: PersonaId, approve: boolean) {
  const offer = db.offers.find((o) => o.id === offerId);
  if (!offer || db.users[offer.toId]?.parentId !== by) throw new Error('not your child');
  if (offer.status !== 'held') throw new Error('already reviewed');
  if (approve) {
    offer.status = 'pending';
    offer.parentApproved = true;
  } else offer.status = 'declined';
}

/** Parent blocks a sender: no more offers or messages to the child, and open offers from them are declined. */
export function block(db: DB, by: PersonaId, childId: PersonaId, blockedId: PersonaId) {
  const child = db.users[childId];
  if (!child || child.parentId !== by) throw new Error('not your child');
  child.blocked = [...new Set([...(child.blocked ?? []), blockedId])];
  for (const o of db.offers)
    if (o.toId === childId && o.fromId === blockedId && o.status !== 'accepted') o.status = 'declined';
}

export function parentDecision(db: DB, requestId: string, approve: boolean) {
  const req = db.requests.find((r) => r.id === requestId);
  if (!req) throw new Error('request gone');
  req.status = approve ? 'approved' : 'declined';
  if (req.kind === 'trade' && req.offerId) {
    const offer = db.offers.find((o) => o.id === req.offerId);
    if (offer) {
      if (approve) completeTrade(db, offer);
      else offer.status = 'declined';
    }
  }
}

/** Store a message and, if it's risky and the receiver is a kid, alert their parent with the reason only. */
export function deliverMessage(db: DB, msg: Message) {
  const offer = db.offers.find((o) => o.id === msg.offerId);
  if (offer) assertNotBlocked(db.users[msg.fromId === offer.fromId ? offer.toId : offer.fromId], msg.fromId);
  db.messages.push(msg);
  if (msg.risk?.level === 'high') {
    // One blocked burst (e.g. "send to both") costs the sender once, not once per copy.
    const from = db.users[msg.fromId];
    const recent = db.messages.some(
      (m) => m.id !== msg.id && m.fromId === msg.fromId && m.risk?.level === 'high' && msg.createdAt - m.createdAt < BURST_MS,
    );
    if (from.credibility != null && !recent) from.credibility = Math.max(0, from.credibility - CREDIBILITY_HIT);
  }
  if (!offer) return;
  const toId = msg.fromId === offer.fromId ? offer.toId : offer.fromId;
  const to = db.users[toId];
  if (msg.risk?.level === 'high' && getPolicy(to).band === 'kid' && to.parentId) {
    db.alerts.unshift({
      id: uid('a'),
      parentId: to.parentId,
      childId: to.id,
      messageId: msg.id,
      offerId: offer.id,
      reason: `A ${msg.kind === 'voice' ? 'voice note' : 'message'} from ${db.users[msg.fromId].name} to ${to.name} was hidden: ${msg.risk.reasons.map((r) => r[0].toLowerCase() + r.slice(1)).join('; ')}.`,
      createdAt: Date.now(),
    });
  }
}
