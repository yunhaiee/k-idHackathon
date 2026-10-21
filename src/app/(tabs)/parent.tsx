import { router } from 'expo-router';
import { View } from 'react-native';

import { OfferThread } from '@/components/trade/OfferThread';
import { Btn, Eyebrow, H, Note, Page, Rule, Txt } from '@/components/ui';
import { act, useDB } from '@/lib/api';
import { useDevice } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { PRODUCTS } from '@/lib/seed';
import { C } from '@/lib/theme';

export default function FamilyOrMe() {
  const db = useDB();
  const { persona } = useDevice();
  if (!db) return null;
  const me = db.users[persona];
  const policy = getPolicy(me);
  const kids = Object.values(db.users).filter((u) => u.parentId === persona);
  const alerts = db.alerts.filter((a) => a.parentId === persona);
  const requests = db.requests.filter((r) => r.parentId === persona && r.status === 'pending');

  return (
    <Page>
      <Eyebrow>{kids.length ? 'Family' : 'Me'}</Eyebrow>
      <H>{kids.length ? `${me.name}'s family` : me.name}</H>
      <Txt color={C.muted}>
        {policy.band === 'kid' ? 'Kid account' : policy.band === 'teen' ? 'Teen account' : 'Adult account'} ·{' '}
        {policy.countryName}
      </Txt>

      {kids.length ? (
        <>
          <Rule />
          <Eyebrow color={C.accent}>Needs your OK</Eyebrow>
          {requests.length === 0 ? <Txt color={C.muted}>Nothing waiting.</Txt> : null}
          {requests.map((r) => {
            const child = db.users[r.childId];
            const offer = r.offerId ? db.offers.find((o) => o.id === r.offerId) : undefined;
            const product = r.productId ? PRODUCTS.find((p) => p.id === r.productId) : undefined;
            return (
              <View key={r.id} style={{ gap: 8 }}>
                <Txt weight="semi">
                  {r.kind === 'trade'
                    ? `${child.name} wants to accept a trade`
                    : `${child.name} asked to buy ${product?.name ?? 'an item'} ($${product?.priceUsd})`}
                </Txt>
                {offer ? <OfferThread db={db} offer={offer} me={persona} /> : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn
                    label={r.kind === 'purchase' ? 'Approve and pay' : 'Approve'}
                    onPress={() => act({ action: 'parentDecision', requestId: r.id, approve: true })}
                    style={{ flex: 1 }}
                  />
                  <Btn
                    label="Decline"
                    kind="quiet"
                    onPress={() => act({ action: 'parentDecision', requestId: r.id, approve: false })}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            );
          })}

          <Rule />
          <Eyebrow color={C.warning}>Safety alerts</Eyebrow>
          <Txt size={13} color={C.muted}>
            You see the reason, never the conversation.
          </Txt>
          {alerts.length === 0 ? <Txt color={C.muted}>No alerts.</Txt> : null}
          {alerts.map((a) => (
            <Note key={a.id} tone={a.read ? 'info' : 'danger'} title={`About ${db.users[a.childId].name}`}>
              {a.reason}
            </Note>
          ))}
        </>
      ) : null}

      <Rule />
      <Btn label="Permissions (k-ID settings)" kind="quiet" onPress={() => router.push('/settings')} />
    </Page>
  );
}
