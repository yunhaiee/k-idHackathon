import { View } from 'react-native';

import { C } from '@/lib/theme';

import { Txt } from './ui';

/** The real market price, the same for everyone, with where it came from (e.g. "TCGplayer market · Flashfire"). */
export function Price({ usd, source, compact }: { usd: number; source?: string; compact?: boolean }) {
  return (
    <View>
      <Txt weight="display" size={compact ? 17 : 24}>
        ${usd.toFixed(2)}
      </Txt>
      {!compact && source ? <Txt color={C.muted}>{source}</Txt> : null}
    </View>
  );
}
