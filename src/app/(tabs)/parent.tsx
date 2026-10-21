import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CheckoutSheet } from '@/components/CheckoutSheet';
import { OfferThread } from '@/components/trade/OfferThread';
import { Btn, Eyebrow, H, Note, Page, Rule, Txt } from '@/components/ui';
import { act, useDB } from '@/lib/api';
import { useCheckout } from '@/lib/checkout';
import { COPY } from '@/lib/copy';
import { cashOf, credibilityOf, type DemoOffer, pronounOf } from '@/lib/demo';
import { getPolicy } from '@/lib/policy';
import { PRODUCTS } from '@/lib/seed';
import { useDevice } from '@/lib/device';
import { C } from '@/lib/theme';
import type { DB, PersonaId } from '@/lib/types';

const cardsValue = (db: DB, ids: string[]) => ids.reduce((s, id) => s + (db.cards.find((c) => c.id === id)?.priceUsd ?? 0), 0);

export default function FamilyOrMe() {
  const db = useDB();
  const { persona } = useDevice();
  const checkout = useCheckout();
  // Block isn't stored on the server yet (NOTES_FOR_YUNHA.md); this keeps the choice visible on this device.
  const [blocked, setBlocked] = useState<PersonaId[]>([]);
  if (!db) return null;
  const me = db.users[persona];
  const policy = getPolicy(me);
  const kids = Object.values(db.users).filter((u) => u.parentId === persona);
  const kidIds = new Set(kids.map((k) => k.id));
  const requests = db.requests.filter((r) => r.parentId === persona && r.status === 'pending');
  // Offers to a child whose k-ID rules make trading parent-managed come to the parent first.
  const reviews = db.offers.filter(
    (o) => kidIds.has(o.toId) && o.status === 'pending' && getPolicy(db.users[o.toId]).tradeNeedsParent,
  );
  const reviewed = new Set(reviews.map((o) => o.id));
  // The server's "unfair offer" alert says the same as the offer review below, so it isn't repeated.
  const alerts = db.alerts.filter(
    (a) => a.parentId === persona && !a.read && (a.messageId || !a.offerId || !reviewed.has(a.offerId)),
  );
  const credibility = credibilityOf(me);
  const offerOf = (id: string) => db.offers.find((o) => o.id === id) as DemoOffer | undefined;

  return (
    <Page>
      <Eyebrow>{kids.length ? 'Family' : 'Me'}</Eyebrow>
      <H>{kids.length ? `${me.name}'s family` : me.name}</H>
      <Txt color={C.muted}>
        {policy.band === 'kid' ? 'Kid account' : policy.band === 'teen' ? 'Teen account' : 'Adult account'} ·{' '}
        {policy.countryName}
      </Txt>
      {credibility != null ? <Txt weight="semi">{COPY.sender.credibility(credibility)}</Txt> : null}

      {kids.length ? (
        <>
          <Rule />
          <Eyebrow color={C.warning}>Safety alerts</Eyebrow>
          <Txt size={13} color={C.muted}>
            {COPY.parent.neverChat}
          </Txt>
          {alerts.length === 0 ? <Txt color={C.muted}>No alerts.</Txt> : null}
          {alerts.map((a) => {
            const msg = a.messageId ? db.messages.find((m) => m.id === a.messageId) : undefined;
            const sender = msg ? db.users[msg.fromId] : undefined;
            const reason =
              msg?.kind === 'voice' && sender
                ? COPY.parent.voiceAlert(
                    sender.name,
                    getPolicy(sender).band,
                    db.users[a.childId].name,
                    msg.risk?.reasons ?? [],
                    pronounOf(db.users[a.childId]),
                    offerOf(msg.offerId)?.analysis?.reasonForParent,
                  )
                : a.reason;
            const isBlocked = sender ? blocked.includes(sender.id) : false;
            return (
              <View key={a.id} style={{ gap: 8 }}>
                <Note tone="danger" title={COPY.parent.alertTitle(db.users[a.childId].name)}>
                  {reason}
                </Note>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {sender ? (
                    <Btn
                      label={isBlocked ? `${sender.name} blocked` : COPY.parent.block(sender.name)}
                      kind="danger"
                      disabled={isBlocked}
                      onPress={() => setBlocked((b) => [...b, sender.id])}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                  <Btn
                    label={COPY.parent.dismiss}
                    kind="quiet"
                    onPress={() => act({ action: 'readAlert', alertId: a.id })}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            );
          })}

          <Rule />
          <Eyebrow color={C.accent}>Needs your OK</Eyebrow>
          <CheckoutSheet checkout={checkout} />
          {requests.length === 0 && reviews.length === 0 ? <Txt color={C.muted}>Nothing waiting.</Txt> : null}

          {reviews.map((o) => {
            const sender = db.users[o.fromId];
            const child = db.users[o.toId];
            const listing = db.listings.find((l) => l.id === o.listingId);
            const card = listing ? db.cards.find((c) => c.id === listing.cardId) : undefined;
            const offered = cardsValue(db, o.offeredCardIds) + cashOf(o);
            return (
              <View key={o.id} style={{ gap: 8 }}>
                <Txt weight="semi">
                  {COPY.parent.offerReview(sender.name, getPolicy(sender).band, child.name, offered, card?.name ?? 'card', card?.priceUsd ?? 0)}
                </Txt>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn
                    label={COPY.parent.decline}
                    kind="quiet"
                    onPress={() => act({ action: 'respondOffer', offerId: o.id, by: child.id, accept: false })}
                    style={{ flex: 1 }}
                  />
                  <Btn
                    label={COPY.parent.approve}
                    onPress={() => act({ action: 'respondOffer', offerId: o.id, by: child.id, accept: true })}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            );
          })}

          {requests.map((r) => {
            const child = db.users[r.childId];
            const offer = r.offerId ? db.offers.find((o) => o.id === r.offerId) : undefined;
            const product = r.productId ? PRODUCTS.find((p) => p.id === r.productId) : undefined;
            return (
              <View key={r.id} style={{ gap: 8 }}>
                <Txt weight="semi">
                  {r.kind === 'trade'
                    ? `${child.name} wants to accept a trade`
                    : COPY.parent.purchaseAsk(child.name, product?.name ?? 'an item', product?.priceUsd ?? 0)}
                </Txt>
                {offer ? <OfferThread db={db} offer={offer} me={persona} /> : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn
                    label={r.kind === 'purchase' ? COPY.parent.approveAndPay : COPY.parent.approve}
                    onPress={() =>
                      r.kind === 'purchase' && r.productId
                        ? checkout.start(persona, r.productId, { payingFor: r.childId, requestId: r.id })
                        : act({ action: 'parentDecision', requestId: r.id, approve: true })
                    }
                    style={{ flex: 1 }}
                  />
                  <Btn
                    label={COPY.parent.decline}
                    kind="quiet"
                    onPress={() => act({ action: 'parentDecision', requestId: r.id, approve: false })}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      <Rule />
      <Btn label="Permissions (k-ID settings)" kind="quiet" onPress={() => router.push('/settings')} />
    </Page>
  );
}
