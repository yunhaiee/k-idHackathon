import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui';
import { COPY } from '@/lib/copy';
import { C } from '@/lib/theme';

/** Credibility score that counts down live when the server lowers it, with a brief "−5" next to it. */
export function Credibility({ score, prefix, size = 12 }: { score: number; prefix?: string; size?: number }) {
  const [shown, setShown] = useState(score);
  const [delta, setDelta] = useState<number | null>(null);
  const prev = useRef(score);

  useEffect(() => {
    const from = prev.current;
    prev.current = score;
    if (from === score) return;
    setDelta(score - from);
    const step = score < from ? -1 : 1;
    let v = from;
    const tick = setInterval(() => {
      v += step;
      setShown(v);
      if (v === score) clearInterval(tick);
    }, 90);
    const hide = setTimeout(() => setDelta(null), 2400);
    return () => {
      clearInterval(tick);
      clearTimeout(hide);
      setShown(score);
    };
  }, [score]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Txt size={size} weight={size > 12 ? 'semi' : 'body'} color={delta && delta < 0 ? C.danger : size > 12 ? C.text : C.muted}>
        {`${prefix ? `${prefix} · ` : ''}${COPY.sender.credibility(shown)}`}
      </Txt>
      {delta ? (
        <Txt size={size} weight="semi" color={delta < 0 ? C.danger : C.success}>
          {delta < 0 ? `−${-delta}` : `+${delta}`}
        </Txt>
      ) : null}
    </View>
  );
}
