import { router } from 'expo-router';
import { View } from 'react-native';

import { CheckoutSheet } from '@/components/CheckoutSheet';
import { Btn, Eyebrow, H, Note, Page, Rule, Txt } from '@/components/ui';
import { act, useDB } from '@/lib/api';
import { useCheckout } from '@/lib/checkout';
import { useDevice } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { PRODUCTS } from '@/lib/seed';
import { C } from '@/lib/theme';

export default function Shop() {
  const db = useDB();
  const { persona } = useDevice();
  const checkout = useCheckout();
  if (!db) return null;
  const me = db.users[persona];
  const policy = getPolicy(me);
  const owned = new Set(db.purchases.filter((p) => p.userId === persona).map((p) => p.productId));
  const asked = new Set(
    db.requests.filter((r) => r.childId === persona && r.kind === 'purchase' && r.status === 'pending').map((r) => r.productId),
  );
  const products = PRODUCTS.filter((p) => !p.subscription || policy.canSubscribe);
  const parentName = me.parentId ? db.users[me.parentId].name : 'a parent';

  return (
    <Page>
      <Eyebrow>Shop · FastSpring</Eyebrow>
      <H>{policy.bigUI ? 'Fun extras' : 'Extras for your binder'}</H>
      {policy.purchase === 'off' ? (
        <View style={{ gap: 6 }}>
          <Note title="Buying is off for you here">
            {policy.access['in-game-purchases'] === 'optin'
              ? 'k-ID lets you turn on purchases yourself.'
              : "k-ID's rules for your age and country don't allow purchases."}
          </Note>
          {policy.access['in-game-purchases'] === 'optin' ? (
            <Btn label="Turn on in k-ID settings" kind="quiet" onPress={() => router.push('/settings')} />
          ) : null}
        </View>
      ) : policy.purchase === 'parent' ? (
        <Note title={`${parentName} buys for you`}>{`Tap "Ask" and ${parentName} gets the request. k-ID: under ${policy.consentAge ?? 'the consent age'} in ${policy.countryName}.`}</Note>
      ) : policy.purchase === 'limit' ? (
        <Note title={`You can spend up to $${policy.purchaseLimitUsd} per item`}>Bigger purchases need a parent.</Note>
      ) : null}

      <CheckoutSheet checkout={checkout} />

      {products.map((p) => {
        const overLimit = policy.purchase === 'limit' && p.priceUsd > (policy.purchaseLimitUsd ?? 0);
        return (
          <View key={p.id} style={{ gap: 6 }}>
            <Rule />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt weight="semi" size={policy.bigUI ? 18 : 16}>
                {p.name}
              </Txt>
              <Txt weight="display" size={17}>
                ${p.priceUsd}
                {p.subscription ? '/mo' : ''}
              </Txt>
            </View>
            <Txt size={13} color={C.muted}>
              {p.blurb}
            </Txt>
            {owned.has(p.id) ? (
              <Txt weight="semi" color={C.success}>
                Owned
              </Txt>
            ) : policy.purchase === 'off' ? null : policy.purchase === 'parent' ? (
              <Btn
                label={asked.has(p.id) ? `Asked ${parentName}` : `Ask ${parentName}`}
                disabled={asked.has(p.id)}
                big={policy.bigUI}
                onPress={() => act({ action: 'requestPurchase', persona, productId: p.id })}
              />
            ) : overLimit ? (
              <Txt size={13} color={C.warning}>
                Over your ${policy.purchaseLimitUsd} limit · needs a parent
              </Txt>
            ) : (
              <Btn label={`Buy · $${p.priceUsd}`} onPress={() => checkout.start(persona, p.id)} />
            )}
          </View>
        );
      })}
      {!policy.canSubscribe ? (
        <Txt size={12} color={C.muted}>
          Collector Pro+ is for adults (k-ID civil age {policy.civilAge ?? 18} in {policy.countryName}).
        </Txt>
      ) : null}
    </Page>
  );
}
