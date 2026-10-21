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
  const give = cardValue(db, offer.offeredCardIds);
  return { want, give, ratio: want ? give / want : 1 };
}

export function createOffer(db: DB, listingId: string, fromId: PersonaId, offeredCardIds: string[]) {
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error('listing gone');
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
    status: 'pending',
    createdAt: Date.now(),
  };
  db.offers.unshift(offer);
  const to = db.users[offer.toId];
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
  if (!offer || offer.toId !== by) throw new Error('not your offer');
  if (!accept) {
    offer.status = 'declined';
    return;
  }
  const me = db.users[by];
  if (getPolicy(me).tradeNeedsParent && me.parentId) {
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

/** Store a message and, if it's risky and the receiver is a kid, alert their parent with the reason only. */
export function deliverMessage(db: DB, msg: Message) {
  db.messages.push(msg);
  const offer = db.offers.find((o) => o.id === msg.offerId);
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
