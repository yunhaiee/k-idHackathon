import { View } from 'react-native';

import { Note, Txt } from '@/components/ui';
import type { Policy } from '@/lib/policy';
import { C } from '@/lib/theme';

/** One trade, explained three ways. Who you are in the trade + your k-ID band decide the wording. */
export function FairMeter({
  give,
  want,
  role,
  policy,
}: {
  give: number;
  want: number;
  role: 'sender' | 'receiver' | 'parent';
  policy: Policy;
}) {
  const ratio = want ? give / want : 1;
  const lopsided = ratio < 0.7;
  const pct = Math.min(100, Math.round(ratio * 100));
  const bar = (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: C.surface2, overflow: 'hidden' }}>
      <View
        style={{
          width: `${pct}%`,
          height: 6,
          backgroundColor: lopsided ? C.danger : ratio < 0.9 ? C.warning : C.success,
        }}
      />
    </View>
  );

  if (policy.band === 'kid' && role === 'receiver')
    return lopsided ? (
      <Note tone="danger" title="This trade isn't fair">
        {`Your card is worth about $${Math.round(want - give)} more than what you'd get.`}
      </Note>
    ) : (
      <Note tone="ok" title="This trade looks fair" />
    );

  if (role === 'sender' && policy.band !== 'adult')
    return (
      <View style={{ gap: 6 }}>
        {bar}
        {lopsided ? (
          <Note tone="warn" title="This offer is very lopsided">
            Fair offers build your reputation. Try adding a card.
          </Note>
        ) : (
          <Txt size={13} color={C.muted}>
            Fair offer.
          </Txt>
        )}
      </View>
    );

  return (
    <View style={{ gap: 6 }}>
      {bar}
      <Txt size={13} color={lopsided ? C.danger : C.muted}>
        {`Offered $${give.toFixed(0)} for $${want.toFixed(0)} · ${pct}% of value${lopsided ? ' · lowball' : ''}`}
      </Txt>
    </View>
  );
}
