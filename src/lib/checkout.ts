import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { act, postJSON } from './api';
import type { PersonaId } from './types';

type CheckoutResult = { url?: string | null; via?: 'fastspring' | 'simulated'; error?: string; needsParent?: boolean };

/** Opens FastSpring's test checkout (or a labeled simulated one) after the server re-checks k-ID rules. */
export function useCheckout() {
  const [pending, setPending] = useState<{
    persona: PersonaId;
    productId: string;
    via: 'fastspring' | 'simulated';
    requestId?: string;
    payingFor?: PersonaId;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (persona: PersonaId, productId: string, opts: { payingFor?: PersonaId; requestId?: string } = {}) => {
    setError(null);
    const res = await postJSON<CheckoutResult>('/api/checkout', { persona, productId, payingFor: opts.payingFor });
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.url) await WebBrowser.openBrowserAsync(res.url);
    setPending({ persona, productId, via: res.via ?? 'simulated', ...opts });
  };

  /** Called after the buyer finishes checkout (FastSpring tab closed, or simulated Pay tapped). */
  const confirm = async () => {
    if (!pending) return;
    await act({
      action: 'recordPurchase',
      persona: pending.payingFor ?? pending.persona,
      productId: pending.productId,
      via: pending.via,
      requestId: pending.requestId,
    });
    setPending(null);
  };

  return { start, confirm, cancel: () => setPending(null), pending, error };
}
