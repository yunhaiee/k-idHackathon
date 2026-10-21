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
  maya: { first: 'Maya', last: 'Collector', email: 'maya.collector@example.com' },
  leo: { first: 'Leo', last: 'Collector', email: 'leo.collector@example.com' },
  anna: { first: 'Anna', last: 'Parent', email: 'anna.parent@example.com' },
  devon: { first: 'Devon', last: 'Collector', email: 'devon.collector@example.com' },
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

type Order = { id?: string; order?: string; completed?: boolean; changed?: number; items?: { product?: string }[] };

async function orderDetails(ids: string[]): Promise<Order[]> {
  if (!ids.length) return [];
  const data = (await (await fetch(`${API}/orders/${ids.join(',')}`, { headers: headers() })).json()) as unknown;
  return Array.isArray(data) ? data : ((data as { orders?: Order[] }).orders ?? [data as Order]);
}

/**
 * Checkout URL. FastSpring's test checkout refuses test cards on API-created sessions ("Not supported while in
 * testing mode"), so by default we open the store's test product page; set FASTSPRING_CHECKOUT_MODE=session
 * to use the Sessions API instead.
 */
export async function checkoutFor(buyer: PersonaId, productId: string) {
  if (env('FASTSPRING_CHECKOUT_MODE') === 'session') return createSession(buyer, productId);
  const host = storeHost();
  if (!host) throw new Error('FASTSPRING_STORE missing');
  return { url: `https://${host}/${productId}`, sessionId: undefined, account: undefined };
}

/** Newest completed TEST order for this product placed after `since` (used with the product-page checkout). */
export async function findTestOrder(productId: string, since: number) {
  const res = await fetch(`${API}/orders?products=${encodeURIComponent(productId)}&scope=test&days=1&limit=50`, {
    headers: headers(),
  });
  const data = (await res.json()) as { orders?: (string | Order)[] };
  const list = data.orders ?? [];
  const orders =
    typeof list[0] === 'string' ? await orderDetails((list as string[]).slice(-20)) : (list as Order[]);
  const hit = orders
    .filter((o) => o.completed && (o.changed ?? 0) >= since - 60_000 && o.items?.some((i) => i.product === productId))
    .sort((a, b) => (b.changed ?? 0) - (a.changed ?? 0))[0];
  return hit ? (hit.id ?? hit.order ?? 'verified') : null;
}

/** Find a completed order for this product on the buyer's account, placed after `since`. */
export async function findCompletedOrder(account: string, productId: string, since: number) {
  const acct = (await (await fetch(`${API}/accounts/${account}`, { headers: headers() })).json()) as { orders?: string[] };
  const ids = acct.orders ?? [];
  if (!ids.length) return null;
  const orders = await orderDetails(ids.slice(-10));
  const hit = orders.find(
    (o) => o.completed && (o.changed ?? Date.now()) >= since - 60_000 && o.items?.some((i) => i.product === productId),
  );
  return hit ? (hit.id ?? hit.order ?? 'verified') : null;
}
