import { router, usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Txt } from '@/components/ui';
import { alertDevice, eventsFor, loadRead, type NotifyEvent, type NotifyTab, saveRead, TAB_PATH } from '@/lib/notify';
import { C } from '@/lib/theme';
import type { DB, PersonaId } from '@/lib/types';

/**
 * Watches the shared state for this persona: toasts what's new since this phone opened, pings/vibrates,
 * and returns unread counts per tab for the badges. Opening a tab marks its events read.
 */
export function useNotifications(db: DB | null, me: PersonaId) {
  // Re-check every 2s too: an offer with no voice note is announced after a short wait, even if no new data arrives.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2000);
    return () => clearInterval(t);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const events = useMemo(() => (db ? eventsFor(db, me) : []), [db, me, tick]);
  const pathname = usePathname();
  const [read, setRead] = useState<Set<string> | null>(null);
  const [toast, setToast] = useState<NotifyEvent | null>(null);
  const seen = useRef<Set<string> | null>(null);

  // Per persona: read ids persist on the device; "seen" starts as whatever already exists (no toast flood on open).
  useEffect(() => {
    seen.current = null;
    setRead(null);
    void loadRead(me).then((r) => setRead(r ?? new Set()));
  }, [me]);

  useEffect(() => {
    if (!db || !read) return;
    if (!seen.current) {
      seen.current = new Set(events.map((e) => e.id));
      return;
    }
    const fresh = events.filter((e) => !seen.current!.has(e.id));
    fresh.forEach((e) => seen.current!.add(e.id));
    const latest = fresh[fresh.length - 1];
    if (latest) {
      setToast(latest);
      alertDevice(latest);
    }
  }, [db, read, events]);

  // Being on a tab reads its events; prune ids that no longer exist (e.g. after Reset demo).
  useEffect(() => {
    if (!read) return;
    const here = (Object.keys(TAB_PATH) as NotifyTab[]).find((t) => pathname === TAB_PATH[t]);
    const ids = new Set(events.map((e) => e.id));
    const next = new Set([...read].filter((id) => ids.has(id)));
    if (here) events.filter((e) => e.tab === here).forEach((e) => next.add(e.id));
    if (next.size !== read.size || [...next].some((id) => !read.has(id))) {
      setRead(next);
      saveRead(me, next);
    }
  }, [pathname, events, read, me]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const unread = (tab: NotifyTab) => (read ? events.filter((e) => e.tab === tab && !read.has(e.id)).length : 0);
  return { toast, dismiss: () => setToast(null), unread };
}

export function Toast({ event, onDismiss }: { event: NotifyEvent; onDismiss: () => void }) {
  const color = event.tone === 'danger' ? C.danger : event.tone === 'ok' ? C.success : C.accent;
  return (
    <Pressable
      onPress={() => {
        onDismiss();
        router.push(TAB_PATH[event.tab] as never);
      }}
      style={[styles.toast, { borderLeftColor: color }]}>
      <Txt weight="semi" size={14}>
        {event.text}
      </Txt>
    </Pressable>
  );
}

export function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <Pressable style={styles.badge} pointerEvents="none">
      <Txt size={10} weight="semi" color="#fff">
        {count > 9 ? '9+' : count}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 8,
    zIndex: 50,
    backgroundColor: C.surface2,
    borderRadius: 14,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
