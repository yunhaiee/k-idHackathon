import { useState } from 'react';
import { View } from 'react-native';

import { Btn, Txt } from '@/components/ui';
import { act, postJSON, refreshDB } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { DEMO } from '@/lib/seed';
import { C } from '@/lib/theme';
import type { DB } from '@/lib/types';

/**
 * Presenter controls for /demo. They only call the app's normal actions (createOffer, /api/voice, reset),
 * so k-ID policy and the server rules decide everything that happens next.
 */
export function DemoControls({ db, onReset }: { db: DB; onReset: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const sender = db.users[DEMO.sender];
  const targets = db.listings.filter(
    (l) => l.sellerId !== DEMO.sender && db.cards.find((c) => c.id === l.cardId)?.name === DEMO.card,
  );

  const sendToBoth = async () => {
    setBusy(COPY.demo.sending);
    setDone(null);
    try {
      const offerIds: string[] = [];
      for (const l of targets) {
        // cashUsd is ignored until the server stores cash on offers (NOTES_FOR_YUNHA.md).
        const after = await act({ action: 'createOffer', listingId: l.id, fromId: DEMO.sender, offeredCardIds: [], cashUsd: DEMO.cashUsd });
        const offer = after.offers?.find((o) => o.listingId === l.id && o.fromId === DEMO.sender);
        if (offer) offerIds.push(offer.id);
      }
      // One sample voice note per offer, checked by Modulate in parallel.
      await Promise.all(offerIds.map((offerId) => postJSON('/api/voice', { offerId, fromId: DEMO.sender })));
      await refreshDB();
      setDone(COPY.demo.sent);
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setBusy(COPY.demo.resetting);
    setDone(null);
    try {
      await act({ action: 'reset' });
      onReset();
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <Btn
        label={sender ? COPY.demo.sendBoth(sender.name, DEMO.cashUsd, DEMO.card) : COPY.demo.sampleVoice}
        onPress={sendToBoth}
        disabled={!sender || targets.length === 0 || !!busy}
      />
      <Btn label={COPY.demo.reset} kind="danger" onPress={reset} disabled={!!busy} />
      {busy || done ? (
        <Txt size={13} color={C.muted}>
          {busy ?? done}
        </Txt>
      ) : null}
    </View>
  );
}
