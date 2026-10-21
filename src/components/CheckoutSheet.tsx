import { View } from 'react-native';

import { Btn, Eyebrow, Note, Txt } from '@/components/ui';
import type { useCheckout } from '@/lib/checkout';
import { PRODUCTS } from '@/lib/seed';
import { C } from '@/lib/theme';

/** After FastSpring's tab closes (or for the simulated path), the buyer confirms here. */
export function CheckoutSheet({ checkout }: { checkout: ReturnType<typeof useCheckout> }) {
  const p = checkout.pending;
  if (!p) return checkout.error ? <Note tone="warn" title={checkout.error} /> : null;
  const product = PRODUCTS.find((x) => x.id === p.productId)!;
  return (
    <View style={{ gap: 8, borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 12 }}>
      <Eyebrow color={p.via === 'simulated' ? C.warning : C.accent}>
        {p.via === 'simulated' ? 'Simulated FastSpring checkout' : 'FastSpring test checkout'}
      </Eyebrow>
      <Txt weight="semi">
        {product.name} · ${product.priceUsd}
        {product.subscription ? '/mo' : ''}
      </Txt>
      <Txt size={13} color={C.muted}>
        {p.via === 'simulated'
          ? "FastSpring's API isn't reachable yet, so this stands in for its checkout. Test card 4242 4242 4242 4242."
          : 'Finish paying in the FastSpring window with test card 4242 4242 4242 4242, then confirm here.'}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn label={p.via === 'simulated' ? 'Pay (test)' : 'I finished checkout'} onPress={checkout.confirm} style={{ flex: 1 }} />
        <Btn label="Cancel" kind="quiet" onPress={checkout.cancel} style={{ flex: 1 }} />
      </View>
      {checkout.error ? <Note tone="warn" title={checkout.error} /> : null}
    </View>
  );
}
