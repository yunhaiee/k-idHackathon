import { Pressable, View } from 'react-native';

import { Eyebrow, Txt } from '@/components/ui';
import { COPY } from '@/lib/copy';
import { deliveryOf } from '@/lib/demo';
import { CREDIBILITY_HIT } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { DB } from '@/lib/types';

/** Shown at the top of the sender's Inbox right after "Send offer": who got it and what happened to it. */
export function SentBanner({ db, offerIds, onDismiss }: { db: DB; offerIds: string[]; onDismiss: () => void }) {
  const offers = offerIds.map((id) => db.offers.find((o) => o.id === id)).filter((o) => !!o);
  if (!offers.length) return null;
  // Only the sender's own messages: a flagged reply from the receiver isn't the sender's fault.
  const flagged = db.messages.find((m) => m.risk?.level === 'high' && offers.some((o) => o.id === m.offerId && o.fromId === m.fromId));
  const tone = { ok: C.success, warn: C.warning, danger: C.danger };
  return (
    <View style={{ borderLeftWidth: 2, borderLeftColor: flagged ? C.danger : C.success, paddingLeft: 12, paddingVertical: 4, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Eyebrow>{COPY.sent.title(offers.length)}</Eyebrow>
        <Pressable onPress={onDismiss} hitSlop={10}>
          <Txt size={12} color={C.muted}>
            {COPY.sent.dismiss}
          </Txt>
        </Pressable>
      </View>
      {offers.map((o) => {
        const d = deliveryOf(db, o);
        return (
          <Txt key={o.id} size={14} color={tone[d.tone]}>
            {d.text}
          </Txt>
        );
      })}
      <Txt size={12} color={flagged ? C.danger : C.muted}>
        {flagged ? COPY.sent.flagged(flagged.kind, CREDIBILITY_HIT) : COPY.sent.checked}
      </Txt>
    </View>
  );
}
