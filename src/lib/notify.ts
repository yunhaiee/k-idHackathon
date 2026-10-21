// Notifications from the shared state every device polls (/api/state), so they reach every phone, not just this tab.
// Each event has a stable id; a phone toasts the ones it hasn't seen since it opened, and badges the unread ones.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COPY } from './copy';
import { type DemoOffer, heldForParent } from './demo';
import { getPolicy } from './policy';
import { PRODUCTS } from './seed';
import type { DB, PersonaId } from './types';

export type NotifyTab = 'inbox' | 'parent' | 'shop';
export type NotifyEvent = { id: string; tab: NotifyTab; text: string; tone: 'info' | 'danger' | 'ok' };

export const TAB_PATH: Record<NotifyTab, string> = { inbox: '/inbox', parent: '/parent', shop: '/shop' };

/** Everything that has "arrived" for this persona, worded for them by their k-ID policy. */
export function eventsFor(db: DB, me: PersonaId): NotifyEvent[] {
  const user = db.users[me];
  if (!user) return [];
  const policy = getPolicy(user);
  const out: NotifyEvent[] = [];
  const name = (id: PersonaId) => db.users[id]?.name ?? 'Someone';
  const cardOf = (listingId: string) => {
    const l = db.listings.find((x) => x.id === listingId);
    return (l && db.cards.find((c) => c.id === l.cardId)?.name) ?? 'card';
  };

  for (const o of db.offers as DemoOffer[]) {
    const risky = db.messages.some((m) => m.offerId === o.id && m.fromId !== me && m.risk?.level === 'high');
    if (o.toId === me) {
      const held = heldForParent(policy) && !o.parentApproved;
      if (held) {
        out.push(
          risky
            ? { id: `hidden:${o.id}`, tab: 'inbox', text: COPY.voice.hidden, tone: 'danger' }
            : { id: `held:${o.id}`, tab: 'inbox', text: COPY.voice.held, tone: 'info' },
        );
      } else {
        out.push({ id: `offer:${o.id}`, tab: 'inbox', text: COPY.offer.newOffer(name(o.fromId), cardOf(o.listingId)), tone: 'info' });
        for (const m of db.messages)
          if (m.offerId === o.id && m.fromId !== me)
            out.push({ id: `msg:${m.id}`, tab: 'inbox', text: COPY.notify.voice(name(m.fromId), m.kind), tone: m.risk?.level === 'high' ? 'danger' : 'info' });
      }
    }
    if (o.fromId === me) {
      if (o.status === 'countered' && o.counterUsd != null)
        out.push({ id: `counter:${o.id}`, tab: 'inbox', text: COPY.notify.counter(name(o.toId), o.counterUsd), tone: 'info' });
      for (const m of db.messages)
        if (m.offerId === o.id && m.fromId === me && m.risk?.level === 'high')
          out.push({ id: `flag:${m.id}`, tab: 'inbox', text: COPY.sender.flagged(5), tone: 'danger' });
    }
    if ((o.fromId === me || o.toId === me) && o.status === 'accepted')
      out.push({ id: `deal:${o.id}`, tab: 'inbox', text: COPY.notify.deal(name(o.fromId === me ? o.toId : o.fromId)), tone: 'ok' });
  }

  // Parent: a held offer to their child that no safety alert covers yet.
  for (const o of db.offers)
    if (o.status === 'held' && db.users[o.toId]?.parentId === me && !db.alerts.some((a) => a.offerId === o.id && a.messageId))
      out.push({ id: `review:${o.id}`, tab: 'parent', text: COPY.notify.review(name(o.fromId), name(o.toId), cardOf(o.listingId)), tone: 'info' });

  for (const a of db.alerts)
    if (a.parentId === me && !a.read) out.push({ id: `alert:${a.id}`, tab: 'parent', text: COPY.notify.alert(name(a.childId)), tone: 'danger' });

  for (const r of db.requests)
    if (r.parentId === me && r.status === 'pending') {
      const product = PRODUCTS.find((p) => p.id === r.productId);
      out.push({
        id: `req:${r.id}`,
        tab: 'parent',
        text: product ? COPY.parent.purchaseAsk(name(r.childId), product.name, product.priceUsd) : COPY.notify.tradeAsk(name(r.childId)),
        tone: 'info',
      });
    }

  for (const p of db.purchases)
    if (p.userId === me) {
      const product = PRODUCTS.find((x) => x.id === p.productId);
      if (product) out.push({ id: `owned:${p.id}`, tab: 'shop', text: COPY.notify.owned(product.name), tone: 'ok' });
    }

  return out;
}

const key = (me: PersonaId) => `kardza.read.${me}`;

export async function loadRead(me: PersonaId): Promise<Set<string> | null> {
  try {
    const raw = await AsyncStorage.getItem(key(me));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

export function saveRead(me: PersonaId, ids: Set<string>) {
  AsyncStorage.setItem(key(me), JSON.stringify([...ids])).catch(() => {});
}

/** A short ping + vibration + (when the tab is in the background) a system notification. All best effort. */
export function alertDevice(ev: NotifyEvent) {
  if (typeof window === 'undefined') return;
  try {
    navigator.vibrate?.(ev.tone === 'danger' ? [80, 60, 80] : 60);
  } catch {}
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = ev.tone === 'danger' ? 520 : 880;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      osc.onended = () => void ctx.close();
    }
  } catch {}
  try {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted')
      new Notification('Kardza', { body: ev.text, icon: '/icon-192.png', tag: ev.id });
  } catch {}
}
