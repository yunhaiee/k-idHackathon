/// <reference types="node" />
// Trade + message rules, enforced on the server from getPolicy (k-ID session), never from the client.
import { getPolicy } from '@/lib/policy';
import type { DB, Message, Offer, PersonaId } from '@/lib/types';

import { uid } from './db';

export const cardValue = (db: DB, ids: string[]) =>
  ids.reduce((sum, id) => sum + (db.cards.find((c) => c.id === id)?.priceUsd ?? 0), 0);

export function offerValues(db: DB, offer: Offer) {
  const listing = db.listings.find((l) => l.id === offer.listingId);
  const want = listing ? cardValue(db, [listing.cardId]) : 0;
  const give = cardValue(db, offer.offeredCardIds) + (offer.cashUsd ?? 0);
  return { want, give, ratio: want ? give / want : 1 };
}

export function createOffer(db: DB, listingId: string, fromId: PersonaId, offeredCardIds: string[], cashUsd?: number) {
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error('listing gone');
  if (db.users[listing.sellerId].blocked?.includes(fromId)) throw new Error('This player blocked you');
  const from = db.users[fromId];
  const fromPol = getPolicy(from);
  if (fromPol.access['virtual-property-ownership'] !== 'on')
    throw new Error('k-ID: trading is not on for this player yet');
  const offer: Offer = {
    id: uid('o'),
    listingId,
    fromId,
    toId: listing.sellerId,
    offeredCardIds,
    cashUsd: cashUsd && cashUsd > 0 ? Math.round(cashUsd) : undefined,
    status: 'pending',
    createdAt: Date.now(),
  };
  db.offers.unshift(offer);
  const to = db.users[offer.toId];
  // A child whose trading a parent manages never sees the offer until that parent reviews it.
  if (getPolicy(to).tradeNeedsParent && to.parentId) {
    offer.status = 'needs-parent';
    return offer;
  }
  const { want, give, ratio } = offerValues(db, offer);
  if (getPolicy(to).band === 'kid' && to.parentId && ratio < 0.7) {
    const card = db.cards.find((c) => c.id === listing.cardId)!;
    db.alerts.unshift({
      id: uid('a'),
      parentId: to.parentId,
      childId: to.id,
      offerId: offer.id,
      reason: `${from.name} offered about $${Math.round(give)} in cards for ${to.name}'s ${card.name} (worth about $${Math.round(want)}). We told ${to.name} it isn't fair.`,
      createdAt: Date.now(),
    });
  }
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

export function respondOffer(db: DB, offerId: string, by: PersonaId, accept: boolean) {
  const offer = db.offers.find((o) => o.id === offerId);
  // The original sender answers a counter-offer: accepting it agrees the deal at the counter price.
  if (offer && offer.status === 'countered' && offer.fromId === by) {
    if (!accept) {
      offer.status = 'declined';
      return;
    }
    offer.cashUsd = offer.counterUsd;
    offer.status = 'accepted'; // "Deal agreed." (demo: no cards move, no payment)
    return;
  }
  if (!offer || offer.toId !== by) throw new Error('not your offer');
  if (!accept) {
    offer.status = 'declined';
    return;
  }
  const me = db.users[by];
  if (getPolicy(me).tradeNeedsParent && me.parentId && !offer.parentApproved) {
    offer.status = 'needs-parent';
    db.requests.unshift({
      id: uid('r'),
      kind: 'trade',
      childId: me.id,
      parentId: me.parentId,
      offerId,
      status: 'pending',
      createdAt: Date.now(),
    });
    return;
  }
  completeTrade(db, offer);
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

/** The receiver counters a pending offer with a cash price. */
export function counterOffer(db: DB, offerId: string, by: PersonaId, cashUsd: number) {
  const o = db.offers.find((x) => x.id === offerId);
  if (!o || o.toId !== by || o.status !== 'pending') throw new Error('not your offer');
  o.counterUsd = Math.round(cashUsd);
  o.status = 'countered';
}

/** A parent reviews an offer held for their child: approve passes it on, decline ends it. */
export function parentReviewOffer(db: DB, offerId: string, by: PersonaId, approve: boolean) {
  const o = db.offers.find((x) => x.id === offerId);
  if (!o || db.users[o.toId].parentId !== by) throw new Error('not your child');
  if (approve) {
    o.status = 'pending';
    o.parentApproved = true;
  } else o.status = 'declined';
}

/** A parent blocks a player for their child: open offers from them are declined, new ones refused. */
export function block(db: DB, by: PersonaId, childId: PersonaId, blockedId: PersonaId) {
  const child = db.users[childId];
  if (child.parentId !== by) throw new Error('not your child');
  child.blocked = [...new Set([...(child.blocked ?? []), blockedId])];
  db.offers
    .filter((o) => o.toId === child.id && o.fromId === blockedId && o.status !== 'accepted')
    .forEach((o) => (o.status = 'declined'));
}

/** Store a message and, if it's risky and the receiver is a kid, alert their parent with the reason only. */
export function deliverMessage(db: DB, msg: Message) {
  const offer = db.offers.find((o) => o.id === msg.offerId);
  if (!offer) return;
  const toId = msg.fromId === offer.fromId ? offer.toId : offer.fromId;
  const to = db.users[toId];
  if (to.blocked?.includes(msg.fromId)) return;
  db.messages.push(msg);
  // Credibility: -5 for a blocked (high-risk) message, charged once per one-minute burst ("send to both").
  if (msg.risk?.level === 'high') {
    const from = db.users[msg.fromId];
    const recent = db.messages.some(
      (m) => m.id !== msg.id && m.fromId === msg.fromId && m.risk?.level === 'high' && msg.createdAt - m.createdAt < 60_000,
    );
    if (from.credibility != null && !recent) from.credibility = Math.max(0, from.credibility - 5);
  }
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
