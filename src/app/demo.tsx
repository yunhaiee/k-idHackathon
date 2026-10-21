// Presenter view: three live phones side by side, each a real copy of the app signed in as one persona.
// Web only (iframes). Every phone polls the same server, so actions in one show up in the others.
import { createElement, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import { DemoControls } from '@/components/DemoControls';
import { Chip, Eyebrow, H, Page, Txt } from '@/components/ui';
import { useDB } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { FLAG } from '@/lib/demo';
import { getPolicy } from '@/lib/policy';
import { DEMO } from '@/lib/seed';
import { C } from '@/lib/theme';
import type { DB, PersonaId } from '@/lib/types';

const PHONE = { w: 390, h: 800 };
const GAP = 24;
const SIDE = 24;
/** Header (title + controls) and the label above each phone. */
const CHROME = { header: 120, label: 34 };

/** Largest scale (≤ 1) at which every phone fits the window side by side. */
function fitScale(win: { width: number; height: number }, phones: number) {
  const across = (win.width - SIDE * 2 - GAP * (phones - 1)) / (PHONE.w * phones);
  const down = (win.height - CHROME.header - CHROME.label - SIDE) / PHONE.h;
  return Math.max(0.3, Math.min(1, across, down));
}

function label(db: DB, id: PersonaId) {
  const u = db.users[id];
  if (!u) return id;
  return `${u.name} · ${getPolicy(u).age} ${FLAG[u.country] ?? u.country}`;
}

function Phone({ id, scale, hidden, nonce }: { id: PersonaId; scale: number; hidden?: boolean; nonce: number }) {
  return (
    <View
      style={{
        width: PHONE.w * scale,
        height: PHONE.h * scale,
        borderRadius: 28 * scale,
        borderWidth: 1,
        borderColor: C.line,
        overflow: 'hidden',
        backgroundColor: C.bg,
        display: hidden ? 'none' : 'flex',
      }}>
      {createElement('iframe', {
        key: `${id}-${nonce}`,
        src: `/?as=${id}`,
        title: id,
        allow: 'microphone; autoplay',
        // Absolute so the frame's flex layout can't shrink it before the scale is applied.
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: PHONE.w,
          height: PHONE.h,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          background: C.bg,
        },
      })}
    </View>
  );
}

export default function Demo() {
  const db = useDB();
  const win = useWindowDimensions();
  const [pick, setPick] = useState<Record<number, number>>({});
  // Bumped on reset so every phone reloads fresh (no half-open sheets left over).
  const [nonce, setNonce] = useState(0);

  if (Platform.OS !== 'web')
    return (
      <Page>
        <H>{COPY.demo.title}</H>
        <Txt color={C.muted}>Open /demo in a laptop browser.</Txt>
      </Page>
    );
  if (!db) return null;

  const scale = fitScale(win, DEMO.phones.length);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: SIDE, gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Eyebrow color={C.accent}>Rules from k-ID · live</Eyebrow>
          <H size={24}>{COPY.demo.title}</H>
        </View>
        <DemoControls db={db} onReset={() => setNonce((n) => n + 1)} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: GAP }}>
        {DEMO.phones.map((group, i) => {
          const shown = pick[i] ?? 0;
          return (
            <View key={i} style={{ gap: 8, alignItems: 'center' }}>
              <View style={{ height: CHROME.label - 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {group.length === 1 ? (
                  <Txt weight="semi">{label(db, group[0])}</Txt>
                ) : (
                  group.map((id, j) => (
                    <Chip key={id} label={label(db, id)} active={j === shown} onPress={() => setPick((p) => ({ ...p, [i]: j }))} />
                  ))
                )}
              </View>
              {/* Both phones in a pair stay mounted so the toggle never loses their state. */}
              {group.map((id, j) => (
                <Phone key={id} id={id} scale={scale} hidden={j !== shown} nonce={nonce} />
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}
