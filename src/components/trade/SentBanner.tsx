import { Pressable, View } from 'react-native';

import { Eyebrow, Txt } from '@/components/ui';
import { COPY } from '@/lib/copy';
import { deliveryOf } from '@/lib/demo';
import { CREDIBILITY_HIT } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { DB } from '@/lib/types';

/** Shown at the top of the sender's Inbox right after "Send offer": one tinted box per offer, saying what happened to it. */
export function SentBanner({ db, offerIds, onDismiss }: { db: DB; offerIds: string[]; onDismiss: () => void }) {
  const offers = offerIds.map((id) => db.offers.find((o) => o.id === id)).filter((o) => !!o);
  if (!offers.length) return null;
  // Only the sender's own messages: a flagged reply from the receiver isn't the sender's fault.
  const flagged = db.messages.find((m) => m.risk?.level === 'high' && offers.some((o) => o.id === m.offerId && o.fromId === m.fromId));
  const tone = { ok: C.success, warn: C.warning, danger: C.danger };
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 16,
        padding: 14,
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Eyebrow>{COPY.sent.title(offers.length)}</Eyebrow>
        <Pressable onPress={onDismiss} hitSlop={12} accessibilityLabel={COPY.sent.dismiss}>
          <Txt size={16} color={C.muted}>
            ✕
          </Txt>
        </Pressable>
      </View>
      {offers.map((o) => {
        const d = deliveryOf(db, o);
        const color = tone[d.tone];
        return (
          <View key={o.id} style={{ backgroundColor: `${color}1F`, borderWidth: 1, borderColor: `${color}66`, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Txt weight="semi" size={14} color={color}>
              {d.text}
            </Txt>
          </View>
        );
      })}
      <Txt size={12} color={flagged ? C.danger : C.muted}>
        {flagged ? COPY.sent.flagged(flagged.kind, CREDIBILITY_HIT) : COPY.sent.checked}
      </Txt>
    </View>
  );
}
