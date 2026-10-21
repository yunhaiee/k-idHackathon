// Hidden presenter fallback (··· → Demo shortcut): does what the sender would do by hand, through the app's
// normal actions (createOffer + /api/voice with the bundled sample), so k-ID policy still decides delivery.
import { act, postJSON, refreshDB } from './api';
import { DEMO } from './seed';
import type { DB } from './types';

export function shortcutTargets(db: DB) {
  return db.listings.filter(
    (l) => l.sellerId !== DEMO.sender && db.cards.find((c) => c.id === l.cardId)?.name === DEMO.card,
  );
}

export async function runDemoShortcut(db: DB) {
  const offerIds: string[] = [];
  for (const l of shortcutTargets(db)) {
    const after = await act({ action: 'createOffer', listingId: l.id, fromId: DEMO.sender, offeredCardIds: [], cashUsd: DEMO.cashUsd });
    const offer = after.offers?.find((o) => o.listingId === l.id && o.fromId === DEMO.sender);
    if (offer) offerIds.push(offer.id);
  }
  await Promise.all(offerIds.map((offerId) => postJSON('/api/voice', { offerId, fromId: DEMO.sender })));
  await refreshDB();
}
