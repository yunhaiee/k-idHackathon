import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Btn, Note, Txt } from '@/components/ui';
import { act } from '@/lib/api';
import { COPY } from '@/lib/copy';
import type { DemoOffer } from '@/lib/demo';
import type { Policy } from '@/lib/policy';
import { C, F } from '@/lib/theme';
import type { DB, PersonaId } from '@/lib/types';

/** Accept / Counter / Decline for the receiver, and Accept / Decline of a counter for the sender. */
export function OfferActions({
  offer,
  me,
  role,
  policy,
  otherName,
  needsParent,
}: {
  offer: DemoOffer;
  me: PersonaId;
  role: 'sender' | 'receiver' | 'parent';
  policy: Policy;
  otherName: string;
  needsParent: boolean;
}) {
  const [counter, setCounter] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const run = async (body: Record<string, unknown>) => {
    setProblem(null);
    const res = (await act(body)) as DB & { error?: string };
    if (res.error) setProblem(/unknown action/i.test(res.error) ? COPY.parent.needsServer : res.error);
    return !res.error;
  };

  const problemNote = problem ? (
    <Txt size={12} color={C.warning}>
      {problem}
    </Txt>
  ) : null;

  if (offer.status === 'countered')
    return role === 'sender' ? (
      <View style={{ gap: 8 }}>
        <Note title={COPY.notify.counter(otherName, offer.counterUsd ?? 0)} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn label={COPY.deal.accept} onPress={() => run({ action: 'respondOffer', offerId: offer.id, by: me, accept: true })} style={{ flex: 1 }} />
          <Btn label="Decline" kind="quiet" onPress={() => run({ action: 'respondOffer', offerId: offer.id, by: me, accept: false })} style={{ flex: 1 }} />
        </View>
        {problemNote}
      </View>
    ) : (
      <Txt color={C.muted}>{COPY.deal.waiting(offer.counterUsd ?? 0, otherName)}</Txt>
    );

  if (offer.status !== 'pending' || role !== 'receiver') return null;

  if (counter != null) {
    const amount = Math.round(Number(counter.replace(/[^0-9.]/g, '')) || 0);
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt weight="display" size={22}>
            $
          </Txt>
          <TextInput
            value={counter}
            onChangeText={setCounter}
            autoFocus
            placeholder="65"
            placeholderTextColor={C.muted}
            inputMode="decimal"
            keyboardType="decimal-pad"
            style={{ flex: 1, color: C.text, fontFamily: F.display, fontSize: 22, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 4 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn
            label={amount ? COPY.deal.counterAt(amount) : COPY.deal.counter}
            disabled={!amount}
            onPress={async () => {
              if (await run({ action: 'counterOffer', offerId: offer.id, by: me, cashUsd: amount })) setCounter(null);
            }}
            style={{ flex: 1 }}
            big={policy.bigUI}
          />
          <Btn label="Cancel" kind="quiet" onPress={() => setCounter(null)} style={{ flex: 1 }} big={policy.bigUI} />
        </View>
        {problemNote}
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn
          label={needsParent ? 'Accept · ask a parent' : COPY.deal.accept}
          onPress={() => run({ action: 'respondOffer', offerId: offer.id, by: me, accept: true })}
          style={{ flex: 1 }}
          big={policy.bigUI}
        />
        <Btn label={COPY.deal.counter} kind="quiet" onPress={() => setCounter('')} style={{ flex: 1 }} big={policy.bigUI} />
        <Btn
          label="Decline"
          kind="quiet"
          onPress={() => run({ action: 'respondOffer', offerId: offer.id, by: me, accept: false })}
          style={{ flex: 1 }}
          big={policy.bigUI}
        />
      </View>
      {problemNote}
    </View>
  );
}
