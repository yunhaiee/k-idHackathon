// Presenter view: three live phones side by side, each a real copy of the app signed in as one persona.
// Web only (iframes). Every phone polls the same server, so actions in one show up in the others.
import { LinearGradient } from 'expo-linear-gradient';
import { createElement, useState } from 'react';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';

import { H, Page, Txt } from '@/components/ui';
import { act, useDB } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { FLAG } from '@/lib/demo';
import { FRAME } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { DEMO } from '@/lib/seed';
import { C, F } from '@/lib/theme';
import type { DB, PersonaId } from '@/lib/types';

/** iPhone-sized screen (points); the app frame sits under a drawn status bar. */
const SCREEN = { w: 390, h: 844 };
const STATUS = 47;
/** Strip under the app for the home indicator, so it never covers the tab bar. */
const HOME = 22;
const BEZEL = 11;
const DEVICE = { w: SCREEN.w + BEZEL * 2, h: SCREEN.h + BEZEL * 2 };
const GAP = 40;
const SIDE = 32;
/** Header, the label above each phone, and the toggle row (unscaled page chrome). */
const CHROME = { header: 76, label: 52, toggle: 44 };

/** Largest scale (≤ 1) at which every phone fits the window side by side. */
function fitScale(win: { width: number; height: number }, phones: number) {
  const across = (win.width - SIDE * 2 - GAP * (phones - 1)) / (DEVICE.w * phones);
  const down = (win.height - CHROME.header - CHROME.label - CHROME.toggle - SIDE) / DEVICE.h;
  return Math.max(0.3, Math.min(1, across, down));
}

/** Name line and a one-line role, both from the k-ID policy (never from the persona id). */
function who(db: DB | null, id: PersonaId) {
  const u = db?.users[id];
  if (!u) return { title: id.charAt(0).toUpperCase() + id.slice(1), role: '' };
  const p = getPolicy(u);
  const kids = db ? Object.values(db.users).filter((x) => x.parentId === id) : [];
  const role = kids.length
    ? `Parent of ${kids.map((k) => k.name).join(', ')}`
    : p.band === 'kid'
      ? `Under ${p.consentAge ?? 'the consent age'} · a parent decides`
      : p.band === 'teen'
        ? `Teen · decides for themself`
        : 'Adult';
  return { title: `${u.name}, ${p.age}`, flag: FLAG[u.country] ?? u.country, role: `${role} · ${p.countryName}` };
}

function StatusBar() {
  return (
    <View style={{ height: STATUS, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30 }}>
      <Txt weight="semi" size={16} style={{ width: 54 }}>
        9:41
      </Txt>
      {/* Dynamic Island */}
      <View style={{ width: 122, height: 35, borderRadius: 20, backgroundColor: '#000', marginTop: 4 }} />
      <View style={{ width: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 11 }}>
          {[4, 6, 8, 11].map((h) => (
            <View key={h} style={{ width: 3, height: h, borderRadius: 1, backgroundColor: C.text }} />
          ))}
        </View>
        <View style={{ width: 24, height: 12, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(244,244,248,0.5)', padding: 1.5 }}>
          <View style={{ flex: 1, width: '80%', borderRadius: 2, backgroundColor: C.text }} />
        </View>
      </View>
    </View>
  );
}

const SideButton = ({ side, top, h }: { side: 'left' | 'right'; top: number; h: number }) => (
  <View
    style={{
      position: 'absolute',
      [side]: -3,
      top,
      width: 3,
      height: h,
      borderRadius: 2,
      backgroundColor: '#2b2b38',
    }}
  />
);

function Phone({ id, scale, hidden }: { id: PersonaId; scale: number; hidden?: boolean }) {
  return (
    // Scaled as one unit, so bezel, status bar and the app all shrink together.
    <View style={{ width: DEVICE.w * scale, height: DEVICE.h * scale, display: hidden ? 'none' : 'flex' }}>
      <View
        style={{
          position: 'absolute',
          width: DEVICE.w,
          height: DEVICE.h,
          transform: [{ scale }],
          transformOrigin: '0 0',
        }}>
        <LinearGradient
          colors={['#3a3a4a', '#1a1a24', '#2c2c3a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: DEVICE.w,
            height: DEVICE.h,
            borderRadius: 64,
            padding: BEZEL,
            shadowColor: '#000',
            shadowOpacity: 0.6,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: 24 },
          }}>
          <View style={{ flex: 1, borderRadius: 53, overflow: 'hidden', backgroundColor: C.bg, borderWidth: 1, borderColor: '#000' }}>
            <StatusBar />
            {createElement('iframe', {
              src: `/?persona=${id}`,
              name: `${FRAME}${id}`,
              title: id,
              allow: 'microphone; autoplay',
              style: { width: SCREEN.w, height: SCREEN.h - STATUS - HOME, border: 0, display: 'block', background: C.bg },
            })}
            <View style={{ height: HOME, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 134, height: 5, borderRadius: 3, backgroundColor: 'rgba(244,244,248,0.55)' }} />
            </View>
          </View>
        </LinearGradient>
        <SideButton side="left" top={150} h={32} />
        <SideButton side="left" top={205} h={62} />
        <SideButton side="left" top={280} h={62} />
        <SideButton side="right" top={230} h={96} />
      </View>
    </View>
  );
}

function Label({ db, id }: { db: DB | null; id: PersonaId }) {
  const w = who(db, id);
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Txt weight="display" size={18}>
        {w.title} {w.flag}
      </Txt>
      <Txt size={12} color={C.muted}>
        {w.role}
      </Txt>
    </View>
  );
}

/** Devon ↔ Anna share a phone: a small segmented switch above it. */
function Toggle({ db, ids, shown, onPick }: { db: DB | null; ids: PersonaId[]; shown: number; onPick: (j: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: C.line }}>
      {ids.map((id, j) => (
        <Pressable
          key={id}
          onPress={() => onPick(j)}
          style={{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: j === shown ? C.surface2 : 'transparent' }}>
          <Txt size={12} weight={j === shown ? 'semi' : 'med'} color={j === shown ? C.text : C.muted}>
            {db?.users[id]?.name ?? id}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

export default function Demo() {
  const db = useDB();
  const win = useWindowDimensions();
  const [pick, setPick] = useState<Record<number, number>>({});
  const [resetting, setResetting] = useState(false);
  // Bumped by Reset: remounts every phone frame.
  const [nonce, setNonce] = useState(0);

  if (Platform.OS !== 'web')
    return (
      <Page>
        <H>{COPY.demo.title}</H>
        <Txt color={C.muted}>Open /demo in a laptop browser.</Txt>
      </Page>
    );
  // No wait on data here: the frames load on their own, so /demo never sits blank.
  const scale = fitScale(win, DEMO.phones.length);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, overflow: 'hidden' }}>
      {/* Soft brand glow behind the phones */}
      {createElement('div', {
        style: {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(60% 50% at 50% 60%, rgba(108,92,231,0.16), transparent 70%), radial-gradient(40% 35% at 80% 10%, rgba(221,160,198,0.08), transparent 70%)',
        },
      })}

      <View style={{ height: CHROME.header, paddingHorizontal: SIDE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {createElement('img', { src: '/icon-192.png', alt: '', style: { width: 36, height: 36, borderRadius: 9 } })}
          <View>
            <Txt weight="display" size={20} style={{ letterSpacing: -0.4 }}>
              Kardza
            </Txt>
            <Txt size={12} color={C.muted}>
              {COPY.demo.tagline}
            </Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.success }} />
            <Txt size={12} color={C.muted}>
              {COPY.demo.live}
            </Txt>
          </View>
          {/* Small presenter reset: same action as ··· → Reset demo, then reloads every phone so no sheet stays open. */}
          <Pressable
            onPress={async () => {
              if (resetting) return;
              setResetting(true);
              try {
                await act({ action: 'reset' });
                setNonce((n) => n + 1);
              } finally {
                setResetting(false);
              }
            }}
            style={({ hovered }: { hovered?: boolean }) => ({
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: C.line,
              backgroundColor: hovered ? C.surface2 : C.surface,
            })}>
            <Txt size={12} weight="semi" color={C.muted} style={{ fontFamily: F.bodySemi }}>
              {resetting ? COPY.demo.resetting : `↺  ${COPY.demo.reset}`}
            </Txt>
          </Pressable>
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: GAP, paddingTop: 4 }}>
        {DEMO.phones.map((group, i) => {
          const shown = pick[i] ?? 0;
          return (
            <View key={i} style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ height: CHROME.label - 12, justifyContent: 'flex-end' }}>
                <Label db={db} id={group[shown]} />
              </View>
              {/* Both phones in a pair stay mounted so the toggle never loses their state. */}
              {group.map((id, j) => (
                <Phone key={`${id}-${nonce}`} id={id} scale={scale} hidden={j !== shown} />
              ))}
              {/* Same height under every phone keeps the three labels and phones aligned. */}
              <View style={{ height: CHROME.toggle - 12, justifyContent: 'center' }}>
                {group.length > 1 ? (
                  <Toggle db={db} ids={group} shown={shown} onPick={(j) => setPick((p) => ({ ...p, [i]: j }))} />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
