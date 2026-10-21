import { useState } from 'react';
import { View } from 'react-native';

import { Chip, Note } from '@/components/ui';
import { COPY } from '@/lib/copy';
import type { Policy } from '@/lib/policy';

/** "Why am I seeing this?" chip: explains a block with the k-ID facts behind it (age, country, consent age). */
export function WhyChip({ name, policy, label }: { name: string; policy: Policy; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8, alignItems: 'flex-start' }}>
      <Chip label={label ?? `k-ID · ${COPY.why.chip}`} active={open} onPress={() => setOpen((o) => !o)} />
      {open ? (
        <Note title={COPY.why.source}>
          {COPY.why.body(name, policy.age, policy.countryName, policy.consentAge)}
        </Note>
      ) : null}
    </View>
  );
}
