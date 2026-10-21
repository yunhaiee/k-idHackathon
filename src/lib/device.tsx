import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { PERSONA_ORDER } from './seed';
import type { PersonaId } from './types';

/** A browser may remember a persona from an older demo; fall back instead of crashing on db.users[id]. */
const valid = (id: string | null): id is PersonaId => !!id && (PERSONA_ORDER as string[]).includes(id);

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
    const params = web ? new URLSearchParams(window.location.search) : null;
    const fromUrl = params ? (params.get('as') ?? params.get('persona')) : null;
    // window.name is per frame and survives reloads, so each /demo phone keeps its own persona even though
    // all frames share one localStorage.
    const fromFrame = web && window.name.startsWith(FRAME) ? window.name.slice(FRAME.length) : null;
    const chosen = valid(fromUrl) ? fromUrl : valid(fromFrame) ? fromFrame : null;
    if (chosen) {
      remember(chosen);
      setP(chosen);
      return;
    }
    AsyncStorage.getItem(KEY)
      .then((v) => (valid(v) ? setP(v) : setP('maya')))
      .catch(() => {});
  }, []);
  const setPersona = (p: PersonaId) => {
    setP(p);
    remember(p);
  };
  return <Ctx.Provider value={{ persona, setPersona }}>{children}</Ctx.Provider>;
}

export const useDevice = () => useContext(Ctx);
