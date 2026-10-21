import { View } from 'react-native';

import type { Policy } from '@/lib/policy';
import { C } from '@/lib/theme';

import { Txt } from './ui';

const round5 = (n: number) => Math.max(1, Math.round(n / 5) * 5);

/** One price, three ways. Which way is decided by getPolicy (k-ID band), never by age here. */
export function Price({ usd, policy, compact }: { usd: number; policy: Policy; compact?: boolean }) {
  if (policy.priceView === 'plain')
    return (
      <View>
        <Txt weight="display" size={compact ? 17 : 24}>
          About ${round5(usd)}
        </Txt>
        {!compact ? <Txt color={C.muted}>That's what people usually pay.</Txt> : null}
      </View>
    );
  if (policy.priceView === 'range')
    return (
      <View>
        <Txt weight="display" size={compact ? 17 : 24}>
          ${Math.round(usd * 0.85)}–${Math.round(usd * 1.15)}
        </Txt>
        {!compact ? <Txt color={C.muted}>Fair range. Offers far below it are lowballs.</Txt> : null}
      </View>
    );
  return (
    <View>
      <Txt weight="display" size={compact ? 17 : 24}>
        ${usd.toFixed(2)}
      </Txt>
      {!compact ? (
        <Txt color={C.muted}>
          Market · 30-day range ${(usd * 0.9).toFixed(0)}–${(usd * 1.1).toFixed(0)} · last sale ${(usd * 0.97).toFixed(2)}
        </Txt>
      ) : null}
    </View>
  );
}
