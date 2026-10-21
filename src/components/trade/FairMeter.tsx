import { View } from 'react-native';

import { Note, Txt } from '@/components/ui';
import { COPY } from '@/lib/copy';
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

  // Kids and teens receiving an offer get the verdict in words; adults get the numbers below.
  if (policy.band !== 'adult' && role === 'receiver')
    return lopsided ? (
      <Note tone="danger" title={COPY.fair.unfairTitle}>
        {COPY.fair.unfairBody(want)}
      </Note>
    ) : (
      <Note tone="ok" title={COPY.fair.fairTitle} />
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
        {`Offered $${give.toFixed(0)} for $${want.toFixed(2)} · ${pct}% of value${lopsided ? ' · lowball' : ''}`}
      </Txt>
    </View>
  );
}
