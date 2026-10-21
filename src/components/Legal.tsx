import { Link } from 'expo-router';
import { View } from 'react-native';

import { Eyebrow, H, Page, Rule, Txt } from '@/components/ui';
import { C } from '@/lib/theme';

export const SUPPORT_EMAIL = 'yunhalee@stanford.edu';
export const UPDATED = 'October 21, 2026';

export type Section = { title: string; body: string[] };

/** Plain, text-led legal page. Public: lives outside the k-ID gate so k-ID's emails can link to it. */
export function LegalPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: Section[] }) {
  return (
    <Page>
      <Link href="/" style={{ alignSelf: 'flex-start' }}>
        <Txt weight="semi" color={C.accent}>
          ← Kardza
        </Txt>
      </Link>
      <Eyebrow>{eyebrow}</Eyebrow>
      <H>{title}</H>
      <Txt size={13} color={C.muted}>
        Last updated {UPDATED}
      </Txt>
      <Txt color={C.muted}>{intro}</Txt>
      {sections.map((s) => (
        <View key={s.title} style={{ gap: 6 }}>
          <Rule />
          <Txt weight="display" size={18}>
            {s.title}
          </Txt>
          {s.body.map((p) => (
            <Txt key={p} color={C.muted}>
              {p}
            </Txt>
          ))}
        </View>
      ))}
      <Rule />
      <Txt color={C.muted}>
        Questions? Email <Txt color={C.text}>{SUPPORT_EMAIL}</Txt>.
      </Txt>
    </Page>
  );
}
