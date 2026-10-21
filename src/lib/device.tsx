import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { PersonaId } from './types';

const KEY = 'kardza.persona';
/** Prefix for window.name; /demo names each iframe `kardza-persona:<id>`. */
export const FRAME = 'kardza-persona:';

function remember(p: PersonaId) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.name = FRAME + p;
  AsyncStorage.setItem(KEY, p).catch(() => {});
}
const Ctx = createContext<{ persona: PersonaId; setPersona: (p: PersonaId) => void }>({
  persona: 'maya',
  setPersona: () => {},
});

/** Each device remembers which persona it is. Web also honours ?as=maya or ?persona=maya for multi-window testing. */
export function DeviceProvider({ children }: { children: ReactNode }) {
  const [persona, setP] = useState<PersonaId>('maya');
  useEffect(() => {
    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    const fromUrl = web
      ? (((p) => p.get('as') ?? p.get('persona'))(new URLSearchParams(window.location.search)) as PersonaId | null)
      : null;
    // window.name is per frame and survives reloads, so each /demo phone keeps its own persona even though
    // all frames share one localStorage.
    const fromFrame = web && window.name.startsWith(FRAME) ? (window.name.slice(FRAME.length) as PersonaId) : null;
    const chosen = fromUrl ?? fromFrame;
    if (chosen) {
      remember(chosen);
      setP(chosen);
      return;
    }
    AsyncStorage.getItem(KEY)
      .then((v) => v && setP(v as PersonaId))
      .catch(() => {});
  }, []);
  const setPersona = (p: PersonaId) => {
    setP(p);
    remember(p);
  };
  return <Ctx.Provider value={{ persona, setPersona }}>{children}</Ctx.Provider>;
}

export const useDevice = () => useContext(Ctx);
