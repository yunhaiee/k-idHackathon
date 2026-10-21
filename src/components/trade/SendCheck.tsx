// Before a message or voice note goes out, ask the server what Kardza Intelligence would say (dry run: same rules,
// Claude and Modulate checks, nothing delivered). If it would be flagged, the sender confirms first, so nobody loses
// credibility by accident. If the check itself fails, sending goes ahead as before.
import { useState } from 'react';
import { Modal, View } from 'react-native';

import { Btn, Eyebrow, Txt } from '@/components/ui';
import { apiUrl } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { CREDIBILITY_HIT } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { PersonaId, Risk } from '@/lib/types';

type Ask = { kind: 'text' | 'voice'; reasons: string[]; resolve: (send: boolean) => void };

async function dryRun(fromId: PersonaId, content: { text?: string; voice?: Blob }): Promise<{ kind: 'text' | 'voice'; risk: Risk }[]> {
  const checks: Promise<{ kind: 'text' | 'voice'; risk: Risk }>[] = [];
  if (content.text)
    checks.push(
      fetch(apiUrl('/api/message'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: '', fromId, text: content.text, dryRun: true }),
      })
        .then((r) => r.json() as Promise<{ risk: Risk }>)
        .then((j) => ({ kind: 'text' as const, risk: j.risk })),
    );
  if (content.voice) {
    const fd = new FormData();
    fd.append('offerId', '');
    fd.append('fromId', fromId);
    fd.append('dryRun', '1');
    fd.append('file', content.voice, content.voice.type.includes('webm') ? 'voice.webm' : 'voice.mp4');
    checks.push(
      fetch(apiUrl('/api/voice'), { method: 'POST', body: fd })
        .then((r) => r.json() as Promise<{ risk: Risk }>)
        .then((j) => ({ kind: 'voice' as const, risk: j.risk })),
    );
  }
  return Promise.all(checks);
}

export function useSendCheck(fromId: PersonaId) {
  const [ask, setAsk] = useState<Ask | null>(null);

  /** Resolves true to send: nothing flagged, the check failed, or the sender chose "Send anyway". */
  const confirmSend = async (content: { text?: string; voice?: Blob }) => {
    if (!content.text && !content.voice) return true;
    let flagged: { kind: 'text' | 'voice'; risk: Risk }[];
    try {
      flagged = (await dryRun(fromId, content)).filter((r) => r.risk?.level === 'high');
    } catch {
      return true;
    }
    if (!flagged.length) return true;
    const reasons = [...new Set(flagged.flatMap((f) => f.risk.reasons))];
    return new Promise<boolean>((resolve) => setAsk({ kind: flagged.some((f) => f.kind === 'voice') ? 'voice' : 'text', reasons, resolve }));
  };

  const answer = (send: boolean) => {
    ask?.resolve(send);
    setAsk(null);
  };

  const modal = (
    <Modal transparent animationType="fade" visible={!!ask} onRequestClose={() => answer(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: `${C.warning}88`, borderRadius: 18, padding: 20, gap: 12, maxWidth: 340, width: '100%' }}>
          <Eyebrow color={C.warning}>{COPY.intel.name}</Eyebrow>
          <Txt weight="semi" size={17}>
            {COPY.check.title(ask?.kind ?? 'text')}
          </Txt>
          <View style={{ gap: 4 }}>
            {(ask?.reasons ?? []).map((r) => (
              <Txt key={r} size={14} color={C.danger}>
                {r}
              </Txt>
            ))}
          </View>
          <Txt size={13} color={C.muted}>
            {COPY.check.body(CREDIBILITY_HIT)}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label={COPY.check.edit} onPress={() => answer(false)} style={{ flex: 1 }} />
            <Btn label={COPY.check.sendAnyway} kind="quiet" onPress={() => answer(true)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );

  return { confirmSend, modal };
}
