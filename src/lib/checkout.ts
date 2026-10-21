import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform } from 'react-native';

import { act, postJSON } from './api';
import type { PersonaId } from './types';

type CheckoutResult = {
  url?: string | null;
  via?: 'fastspring' | 'simulated';
  account?: string;
  since?: number;
  error?: string;
  needsParent?: boolean;
};

/** Opens FastSpring's test checkout (or a labeled simulated one) after the server re-checks k-ID rules. */
export function useCheckout() {
  const [pending, setPending] = useState<{
    persona: PersonaId;
    productId: string;
    via: 'fastspring' | 'simulated';
    requestId?: string;
    payingFor?: PersonaId;
    account?: string;
    since?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (persona: PersonaId, productId: string, opts: { payingFor?: PersonaId; requestId?: string } = {}) => {
    setError(null);
    // Phone Safari blocks pop-ups opened after an await, so open the tab during the tap and fill it in later.
    const tab = Platform.OS === 'web' && typeof window !== 'undefined' ? window.open('', '_blank') : null;
    const res = await postJSON<CheckoutResult>('/api/checkout', { persona, productId, payingFor: opts.payingFor });
    if (res.error) {
      tab?.close();
      setError(res.error);
      return;
    }
    if (res.url) {
      if (tab) tab.location.href = res.url;
      else await WebBrowser.openBrowserAsync(res.url);
    } else tab?.close();
    setPending({ persona, productId, via: res.via ?? 'simulated', account: res.account, since: res.since, ...opts });
  };

  /** Called after the buyer finishes checkout (FastSpring tab closed, or simulated Pay tapped). */
  const confirm = async () => {
    if (!pending) return;
    let orderId: string | undefined;
    if (pending.via === 'fastspring') {
      // Only mark it paid once FastSpring itself reports the completed order.
      const v = await postJSON<{ ok: boolean; orderId?: string }>('/api/checkout/verify', {
        account: pending.account,
        productId: pending.productId,
        since: pending.since ?? 0,
      });
      if (!v.ok) {
        setError("FastSpring hasn't confirmed this order yet. Finish paying with test card 4242 4242 4242 4242, then tap again.");
        return;
      }
      orderId = v.orderId;
    }
    setError(null);
    await act({
      action: 'recordPurchase',
      persona: pending.payingFor ?? pending.persona,
      productId: pending.productId,
      via: pending.via,
      requestId: pending.requestId,
      orderId,
    });
    setPending(null);
  };

  return { start, confirm, cancel: () => setPending(null), pending, error };
}
