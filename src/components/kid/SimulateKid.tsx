import { Pressable } from 'react-native';

import { Txt } from '@/components/ui';
import { act } from '@/lib/api';
import { simulatedKid } from '@/lib/simulated';
import { C } from '@/lib/theme';
import type { Country, User } from '@/lib/types';

/** Escape hatch when k-ID can't be reached: clearly labeled stand-in rules. */
export function SimulateKid({ user, country }: { user: User; country: Country }) {
  return (
    <Pressable
      onPress={() => act({ action: 'kidUpdate', persona: user.id, country, patch: simulatedKid(user.age, country) })}
      style={{ paddingVertical: 12, alignSelf: 'center' }}>
      <Txt size={12} color={C.muted}>
        k-ID unreachable? Use simulated rules
      </Txt>
    </Pressable>
  );
}
