import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { PersonaId } from './types';

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
    if (fromUrl) {
      setP(fromUrl);
      AsyncStorage.setItem(KEY, fromUrl).catch(() => {});
      return;
    }
    AsyncStorage.getItem(KEY)
      .then((v) => v && setP(v as PersonaId))
      .catch(() => {});
  }, []);
  const setPersona = (p: PersonaId) => {
    setP(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  };
  return <Ctx.Provider value={{ persona, setPersona }}>{children}</Ctx.Provider>;
}

export const useDevice = () => useContext(Ctx);
