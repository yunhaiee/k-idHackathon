import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CheckoutSheet } from '@/components/CheckoutSheet';
import { CredibilityCard } from '@/components/Credibility';
import { KidRulesCard } from '@/components/KidRulesCard';
import { OfferThread } from '@/components/trade/OfferThread';
import { Btn, Eyebrow, H, Note, Page, Rule, Txt } from '@/components/ui';
import { act, useDB } from '@/lib/api';
import { useCheckout } from '@/lib/checkout';
import { COPY } from '@/lib/copy';
import { blockedOf, cashOf, credibilityOf, type DemoOffer, pronounOf } from '@/lib/demo';
import { getPolicy } from '@/lib/policy';
import { PRODUCTS } from '@/lib/seed';
import { useDevice } from '@/lib/device';
import { C } from '@/lib/theme';
import type { DB } from '@/lib/types';

const cardsValue = (db: DB, ids: string[]) => ids.reduce((s, id) => s + (db.cards.find((c) => c.id === id)?.priceUsd ?? 0), 0);

export default function FamilyOrMe() {
  const db = useDB();
  const { persona } = useDevice();
  const checkout = useCheckout();
  // Per-alert note when a server action isn't there yet (NOTES_FOR_YUNHA.md, R4), so a tap never fails silently.
  const [problem, setProblem] = useState<Record<string, string>>({});
  if (!db) return null;
  const me = db.users[persona];
  const policy = getPolicy(me);
  const kids = Object.values(db.users).filter((u) => u.parentId === persona);
  const kidIds = new Set(kids.map((k) => k.id));
  const requests = db.requests.filter((r) => r.parentId === persona && r.status === 'pending');
  // Offers to a child whose k-ID rules make trading parent-managed come to the parent first.
  const reviews = db.offers.filter(
    // Held = needs-parent before the parent has reviewed it (no final-approval request yet).
    (o) => kidIds.has(o.toId) && o.status === 'needs-parent' && !o.parentApproved && !db.requests.some((r) => r.offerId === o.id),
  );
  const reviewed = new Set(reviews.map((o) => o.id));
  // The server's "unfair offer" alert says the same as the offer review below, so it isn't repeated.
  const alerts = db.alerts.filter(
    (a) => a.parentId === persona && !a.read && (a.messageId || !a.offerId || !reviewed.has(a.offerId)),
  );
  // Offers that already have a safety alert are decided there (Block / Let … see it), not in the review list.
  const alerted = new Set(alerts.filter((a) => a.messageId && a.offerId).map((a) => a.offerId!));
  const openReviews = reviews.filter((o) => !alerted.has(o.id));

  /** Run a server action; returns false (and notes why on that row) if the server doesn't know it yet. */
  const tryAct = async (row: string, body: Record<string, unknown>) => {
    const res = (await act(body)) as DB & { error?: string };
    if (res.error) {
      setProblem((p) => ({ ...p, [row]: /unknown action/i.test(res.error!) ? COPY.parent.needsServer : res.error! }));
      return false;
    }
    setProblem((p) => ({ ...p, [row]: '' }));
    return true;
  };
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
      {credibility != null ? <CredibilityCard score={credibility} /> : null}

      {kids.length ? (
        <>
          {/* Alerts and approvals appear above the k-ID card only when there's something to act on. */}
          {alerts.length ? (
            <>
              <Rule />
              <Eyebrow color={C.warning}>Safety alerts</Eyebrow>
              <Txt size={13} color={C.muted}>
                {COPY.parent.neverChat}
              </Txt>
            </>
          ) : null}
          {alerts.map((a) => {
            const msg = a.messageId ? db.messages.find((m) => m.id === a.messageId) : undefined;
            const sender = msg ? db.users[msg.fromId] : undefined;
            const reason =
              msg && sender
                ? COPY.parent.voiceAlert(
                    sender.name,
                    getPolicy(sender).band,
                    db.users[a.childId].name,
                    msg.risk?.reasons ?? [],
                    pronounOf(db.users[a.childId]),
                    offerOf(msg.offerId)?.analysis?.reasonForParent,
                    msg.kind,
                  )
                : a.reason;
            const child = db.users[a.childId];
            const isBlocked = !!sender && blockedOf(child).includes(sender.id);
            const isReleased = !!(msg && offerOf(msg.offerId)?.parentApproved);
            return (
              <View key={a.id} style={{ gap: 8 }}>
                <Note tone="danger" title={COPY.parent.alertTitle(child.name)}>
                  {reason}
                </Note>
                {isBlocked || isReleased ? (
                  <View style={{ gap: 8 }}>
                    <Note tone="ok" title={isBlocked ? COPY.parent.blocked(sender!.name, child.name) : COPY.parent.released(child.name)} />
                    <Btn label={COPY.parent.dismiss} kind="quiet" onPress={() => act({ action: 'readAlert', alertId: a.id })} />
                  </View>
                ) : sender && msg ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Btn
                      label={COPY.parent.block(sender.name)}
                      kind="danger"
                      onPress={() => tryAct(a.id, { action: 'block', by: persona, childId: child.id, blockedId: sender.id })}
                      style={{ flex: 1 }}
                    />
                    <Btn
                      label={COPY.parent.letSee(child.name)}
                      kind="quiet"
                      onPress={() => tryAct(a.id, { action: 'parentReviewOffer', offerId: msg.offerId, by: persona, approve: true })}
                      style={{ flex: 1 }}
                    />
                  </View>
                ) : (
                  <Btn label={COPY.parent.dismiss} kind="quiet" onPress={() => act({ action: 'readAlert', alertId: a.id })} />
                )}
                {problem[a.id] ? <Txt size={12} color={C.warning}>{problem[a.id]}</Txt> : null}
              </View>
            );
          })}

          {requests.length || openReviews.length || checkout.pending || checkout.error ? (
            <>
              <Rule />
              <Eyebrow color={C.accent}>Needs your OK</Eyebrow>
            </>
          ) : null}
          <CheckoutSheet checkout={checkout} />

          {openReviews.map((o) => {
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
                {problem[o.id] ? <Txt size={12} color={C.warning}>{problem[o.id]}</Txt> : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn
                    label={COPY.parent.decline}
                    kind="quiet"
                    onPress={async () => {
                      // Until parentReviewOffer exists, declining on the child's behalf is the closest real action.
                      if (!(await tryAct(o.id, { action: 'parentReviewOffer', offerId: o.id, by: persona, approve: false })))
                        await act({ action: 'respondOffer', offerId: o.id, by: child.id, accept: false });
                    }}
                    style={{ flex: 1 }}
                  />
                  <Btn
                    label={COPY.parent.approve}
                    onPress={() => tryAct(o.id, { action: 'parentReviewOffer', offerId: o.id, by: persona, approve: true })}
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
          <Rule />
          {kids.map((k) => (
            <KidRulesCard key={k.id} kid={k} />
          ))}
        </>
      ) : null}

      <Rule />
      <Btn label="Permissions (k-ID settings)" kind="quiet" onPress={() => router.push('/settings')} />
    </Page>
  );
}
