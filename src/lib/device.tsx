import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { PERSONA_ORDER } from './seed';
import type { PersonaId } from './types';

/** A browser may remember a persona from an older demo; fall back instead of crashing on db.users[id]. */
const valid = (id: string | null): id is PersonaId => !!id && (PERSONA_ORDER as string[]).includes(id);

const KEY = 'kardza.persona';
const Ctx = createContext<{ persona: PersonaId; setPersona: (p: PersonaId) => void }>({
  persona: 'maya',
  setPersona: () => {},
});

/** Each device remembers which persona it is. Web also honours ?as=jordan for quick multi-window testing. */
export function DeviceProvider({ children }: { children: ReactNode }) {
  const [persona, setP] = useState<PersonaId>('maya');
  useEffect(() => {
    const fromUrl =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('as') as PersonaId | null)
        : null;
    if (valid(fromUrl)) {
      setP(fromUrl);
      AsyncStorage.setItem(KEY, fromUrl).catch(() => {});
      return;
    }
    AsyncStorage.getItem(KEY)
      .then((v) => (valid(v) ? setP(v) : setP('maya')))
      .catch(() => {});
  }, []);
  const setPersona = (p: PersonaId) => {
    setP(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  };
  return <Ctx.Provider value={{ persona, setPersona }}>{children}</Ctx.Provider>;
}

export const useDevice = () => useContext(Ctx);
