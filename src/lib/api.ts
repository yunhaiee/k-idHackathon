import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { DB } from './types';

/** Absolute origin of our server: Cloud Run override, else the Expo dev server (tunnel = https). */
export function apiOrigin(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  const host = Constants.expoConfig?.hostUri ?? 'localhost:8081';
  // Tunnels (on.expo.app, exp.direct, ngrok) are https; LAN IPs and localhost are http.
  const secure = !/^(localhost|127\.|10\.|192\.168\.|172\.)/.test(host);
  return `${secure ? 'https' : 'http'}://${host}`;
}

export const apiUrl = (p: string) => `${apiOrigin()}${p}`;

export async function postJSON<T = unknown>(p: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(p), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

// One shared poller per app instance; every screen reads the same snapshot.
let current: DB | null = null;
const listeners = new Set<(db: DB) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function publish(db: DB) {
  current = db;
  listeners.forEach((l) => l(db));
}

async function poll() {
  try {
    const res = await fetch(apiUrl(`/api/state?v=${current?.version ?? 0}`));
    if (res.status === 200) publish((await res.json()) as DB);
  } catch {
    // offline for a tick; keep the last snapshot
  }
}

export function useDB(): DB | null {
  const [db, setDb] = useState<DB | null>(current);
  useEffect(() => {
    listeners.add(setDb);
    if (!timer) {
      void poll();
      timer = setInterval(poll, 1500);
    }
    return () => {
      listeners.delete(setDb);
    };
  }, []);
  return db;
}

/** POST an action to /api/state and publish the returned snapshot immediately. */
export function act(body: Record<string, unknown>) {
  return postJSON<DB>('/api/state', body).then((db) => {
    if (db && db.users) publish(db);
    return db;
  });
}

export const refreshDB = poll;
