import { createElement, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { Eyebrow, Txt } from '@/components/ui';
import { COPY, credibilityLabel, credibilityTone } from '@/lib/copy';
import { C, F } from '@/lib/theme';

const TONE = { ok: C.success, warn: C.warning, danger: C.danger };

/** Counts toward a new score one point at a time, and reports the last change for the "−5" flash. */
function useLiveScore(score: number) {
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
    const hide = setTimeout(() => setDelta(null), 2600);
    return () => {
      clearInterval(tick);
      clearTimeout(hide);
      setShown(score);
    };
  }, [score]);
  return { shown, delta };
}

/** A progress ring (0–100) colored by tier, with the number in the middle. */
export function CredibilityRing({ score, size = 36 }: { score: number; size?: number }) {
  const color = TONE[credibilityTone(score)];
  const stroke = Math.max(3, size / 11);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Platform.OS === 'web' ? (
        createElement(
          'svg',
          { width: size, height: size, style: { position: 'absolute', inset: 0, transform: 'rotate(-90deg)' } },
          createElement('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: C.surface2, strokeWidth: stroke }),
          createElement('circle', {
            cx: size / 2,
            cy: size / 2,
            r,
            fill: 'none',
            stroke: color,
            strokeWidth: stroke,
            strokeLinecap: 'round',
            strokeDasharray: `${circ * pct} ${circ}`,
            style: { transition: 'stroke-dasharray 400ms ease, stroke 400ms ease' },
          }),
        )
      ) : (
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: color }} />
      )}
      <Txt weight="display" size={Math.round(size * 0.36)} style={{ fontFamily: F.displayBold, lineHeight: size * 0.42 }}>
        {score}
      </Txt>
    </View>
  );
}

/** Inline badge for offer cards and listings: ring + "Devon · Building trust", flashing "−5" when it drops. */
export function Credibility({ score, prefix }: { score: number; prefix?: string; size?: number }) {
  const { shown, delta } = useLiveScore(score);
  const color = TONE[credibilityTone(shown)];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <CredibilityRing score={shown} size={34} />
      <View>
        {prefix ? (
          <Txt size={13} weight="semi">
            {prefix}
          </Txt>
        ) : null}
        <Txt size={12} weight="med" color={color}>
          {credibilityLabel(shown)}
        </Txt>
      </View>
      {delta ? (
        <View style={{ backgroundColor: delta < 0 ? 'rgba(232,105,127,0.15)' : 'rgba(76,201,160,0.15)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Txt size={12} weight="semi" color={delta < 0 ? C.danger : C.success}>
            {delta < 0 ? `−${-delta}` : `+${delta}`}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

/** Profile card for the Me tab: big ring, tier, and how the score moves. */
export function CredibilityCard({ score }: { score: number }) {
  const { shown, delta } = useLiveScore(score);
  const color = TONE[credibilityTone(shown)];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: C.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.line,
        padding: 16,
      }}>
      <CredibilityRing score={shown} size={76} />
      <View style={{ flex: 1, gap: 4 }}>
        <Eyebrow>{COPY.sender.credibilityTitle}</Eyebrow>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt weight="display" size={20} color={color}>
            {credibilityLabel(shown)}
          </Txt>
          {delta ? (
            <Txt size={14} weight="semi" color={delta < 0 ? C.danger : C.success}>
              {delta < 0 ? `−${-delta}` : `+${delta}`}
            </Txt>
          ) : null}
        </View>
        <Txt size={12} color={C.muted}>
          {COPY.sender.credibilityHow}
        </Txt>
      </View>
    </View>
  );
}
