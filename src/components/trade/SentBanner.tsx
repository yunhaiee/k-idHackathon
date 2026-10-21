import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Btn, Eyebrow, Txt } from '@/components/ui';
import { COPY } from '@/lib/copy';
import { deliveryOf } from '@/lib/demo';
import { CREDIBILITY_HIT } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { DB } from '@/lib/types';

/**
 * Shown at the top of the sender's Inbox right after "Send offer": one tinted box per offer saying what happened
 * to it, each with its own ✕. If Kardza Intelligence flagged what was sent, a warning pops up in the middle.
 */
export function SentBanner({ db, offerIds, onDismiss }: { db: DB; offerIds: string[]; onDismiss: () => void }) {
  const [closed, setClosed] = useState<string[]>([]);
  const [warned, setWarned] = useState(false);
  const all = offerIds.map((id) => db.offers.find((o) => o.id === id)).filter((o) => !!o);
  const offers = all.filter((o) => !closed.includes(o.id));
  // Only the sender's own messages: a flagged reply from the receiver isn't the sender's fault.
  const flagged = db.messages.find((m) => m.risk?.level === 'high' && all.some((o) => o.id === m.offerId && o.fromId === m.fromId));
  const tone = { ok: C.success, warn: C.warning, danger: C.danger };
  const close = (id: string) => {
    const next = [...closed, id];
    setClosed(next);
    if (all.every((o) => next.includes(o.id))) onDismiss();
  };
  return (
    <View style={{ gap: 8 }}>
      {offers.length ? <Eyebrow>{COPY.sent.title(all.length)}</Eyebrow> : null}
      {offers.map((o) => {
        const d = deliveryOf(db, o);
        const color = tone[d.tone];
        return (
          <View
            key={o.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: `${color}1F`,
              borderWidth: 1,
              borderColor: `${color}66`,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}>
            <Txt weight="semi" size={14} color={color}>
              {d.text}
            </Txt>
            <Pressable onPress={() => close(o.id)} hitSlop={12} accessibilityLabel={COPY.sent.dismiss}>
              <Txt size={15} color={color}>
                ✕
              </Txt>
            </Pressable>
          </View>
        );
      })}
      <Modal transparent animationType="fade" visible={!!flagged && !warned} onRequestClose={() => setWarned(true)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: `${C.danger}88`, borderRadius: 18, padding: 20, gap: 14, maxWidth: 340, width: '100%' }}>
            <Txt weight="semi" size={16}>
              {flagged ? COPY.sent.flagged(flagged.kind, CREDIBILITY_HIT) : ''}
            </Txt>
            <Btn label="OK" onPress={() => setWarned(true)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
