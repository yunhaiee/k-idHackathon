/// <reference types="node" />
// FastSpring REST: create checkout sessions and verify completed orders. Test store, test card 4242….
import type { PersonaId } from '@/lib/types';

import { env } from './env';

const API = 'https://api.fastspring.com';

function headers() {
  const user = env('FASTSPRING_API_USERNAME');
  const pass = env('FASTSPRING_API_PASSWORD');
  if (!user || !pass) throw new Error('FastSpring credentials missing');
  return {
    Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Kardza/1.0 (Build for Everyone hackathon)',
  };
}

export const storeHost = () => env('FASTSPRING_STORE');

/** The buyer of record. A parent paying for a child is the buyer (never the child). */
const BUYERS: Record<PersonaId, { first: string; last: string; email: string }> = {
  mom: { first: 'Alex', last: 'Parent', email: 'alex.parent@example.com' },
  jordan: { first: 'Jordan', last: 'Teen', email: 'jordan.teen@example.com' },
  maya: { first: 'Maya', last: 'Kid', email: 'maya.kid@example.com' },
};

export async function createSession(buyer: PersonaId, productId: string) {
  const host = storeHost();
  if (!host) throw new Error('FASTSPRING_STORE missing');
  const res = await fetch(`${API}/sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ contact: { ...BUYERS[buyer], country: 'US' }, items: [{ product: productId, quantity: 1 }] }),
    signal: AbortSignal.timeout(10000),
  });
  const data = (await res.json()) as { id?: string; account?: string; message?: string };
  if (!res.ok || !data.id) throw new Error(`FastSpring sessions ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return { url: `https://${host}/session/${data.id}`, sessionId: data.id, account: data.account };
}

/** Find a completed order for this product on the buyer's account, placed after `since`. */
export async function findCompletedOrder(account: string, productId: string, since: number) {
  const acct = (await (await fetch(`${API}/accounts/${account}`, { headers: headers() })).json()) as { orders?: string[] };
  const ids = acct.orders ?? [];
  if (!ids.length) return null;
  const res = await fetch(`${API}/orders/${ids.slice(-10).join(',')}`, { headers: headers() });
  const data = (await res.json()) as unknown;
  type Order = { id?: string; order?: string; completed?: boolean; changed?: number; items?: { product?: string }[] };
  const orders: Order[] = Array.isArray(data) ? data : ((data as { orders?: Order[] }).orders ?? [data as Order]);
  const hit = orders.find(
    (o) => o.completed && (o.changed ?? Date.now()) >= since - 60_000 && o.items?.some((i) => i.product === productId),
  );
  return hit ? (hit.id ?? hit.order ?? 'verified') : null;
}
