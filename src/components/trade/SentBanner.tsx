import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui';
import { COPY } from '@/lib/copy';
import { deliveryOf } from '@/lib/demo';
import { C } from '@/lib/theme';
import type { DB } from '@/lib/types';

/** Shown at the top of the sender's Inbox right after "Send offer": who got it and what happened to it. */
export function SentBanner({ db, offerIds, onDismiss }: { db: DB; offerIds: string[]; onDismiss: () => void }) {
  const offers = offerIds.map((id) => db.offers.find((o) => o.id === id)).filter((o) => !!o);
  if (!offers.length) return null;
  const flagged = db.messages.some((m) => offerIds.includes(m.offerId) && m.risk?.level === 'high');
  const tone = { ok: C.success, warn: C.warning, danger: C.danger };
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.line,
        padding: 14,
        gap: 8,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt weight="display" size={17} color={C.success}>
          {COPY.sent.title(offers.length)}
        </Txt>
        <Pressable onPress={onDismiss} hitSlop={10}>
          <Txt color={C.muted}>✕</Txt>
        </Pressable>
      </View>
      {offers.map((o) => {
        const d = deliveryOf(db, o);
        return (
          <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone[d.tone] }} />
            <Txt size={14}>{d.text}</Txt>
          </View>
        );
      })}
      <Txt size={12} color={flagged ? C.danger : C.muted}>
        {flagged ? COPY.sent.flagged : COPY.sent.checked}
      </Txt>
    </View>
  );
}
