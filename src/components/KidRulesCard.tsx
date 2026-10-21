import { View } from 'react-native';

import { CredibilityRing } from '@/components/Credibility';
import { Eyebrow, Txt } from '@/components/ui';
import { WhyChip } from '@/components/WhyChip';
import { COPY, credibilityLabel } from '@/lib/copy';
import { credibilityOf, FLAG } from '@/lib/demo';
import { type Access, getPolicy, type KidPermName } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { User } from '@/lib/types';

/** The rows a parent cares about, each read from the child's k-ID permission. */
const ROWS: { perm: KidPermName; label: string }[] = [
  { perm: 'virtual-property-ownership', label: 'Trading' },
  { perm: 'text-chat-private', label: 'Messages from strangers' },
  { perm: 'in-game-purchases', label: 'Purchases' },
];

const TONE: Record<Access, string> = { on: C.success, parent: C.warning, optin: C.accent, off: C.muted };

/** Parent's view of one child: what k-ID decided for them in their country, from their real session. */
export function KidRulesCard({ kid }: { kid: User }) {
  const policy = getPolicy(kid);
  const score = credibilityOf(kid);
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 18, gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Eyebrow color={C.accent}>{COPY.kidRules.title(kid.name)}</Eyebrow>
        <Txt weight="display" size={18}>
          {COPY.kidRules.who(kid.name, policy.age, `${FLAG[kid.country] ?? ''} ${policy.countryName}`, policy.consentAge)}
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        {ROWS.map((r) => {
          const a = policy.access[r.perm];
          return (
            <View key={r.perm} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt color={C.muted}>{r.label}</Txt>
              <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: C.surface2 }}>
                <Txt size={13} weight="semi" color={TONE[a]}>
                  {COPY.kidRules.access(a, kid.name)}
                </Txt>
              </View>
            </View>
          );
        })}
      </View>

      {score != null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 }}>
          <CredibilityRing score={score} size={34} />
          <Txt size={13} color={C.muted}>
            {COPY.kidRules.credibility(kid.name, credibilityLabel(score))}
          </Txt>
        </View>
      ) : null}

      <WhyChip name={kid.name} policy={policy} label={`ⓘ  ${COPY.why.source}`} />
    </View>
  );
}
