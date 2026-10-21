// Age-gated checkout. The k-ID-derived policy is checked HERE, on the server, before any FastSpring link
// is handed out. Order: FastSpring Sessions API → FastSpring test product page → labeled simulated checkout.
import { getPolicy } from '@/lib/policy';
import { PRODUCTS } from '@/lib/seed';
import type { PersonaId } from '@/lib/types';
import { readDB } from '@/server/db';

async function fastspringSession(productId: string): Promise<string | null> {
  const user = process.env.FASTSPRING_API_USERNAME;
  const pass = process.env.FASTSPRING_API_PASSWORD;
  const store = process.env.FASTSPRING_STORE?.split(/\s/)[0];
  if (!user || !pass || !store) return null;
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
  const res = await fetch('https://api.fastspring.com/sessions', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', 'User-Agent': 'Kardza/1.0' },
    body: JSON.stringify({ items: [{ product: productId, quantity: 1 }] }),
  });
  if (!res.ok) {
    console.warn('[checkout] FastSpring sessions', res.status);
    return null;
  }
  const data = (await res.json()) as { id?: string };
  return data.id ? `https://${store}/session/${data.id}` : null;
}

export async function POST(request: Request) {
  const { persona, productId, payingFor } = (await request.json()) as {
    persona: PersonaId;
    productId: string;
    /** A parent paying for a child's approved request. */
    payingFor?: PersonaId;
  };
  const db = await readDB();
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return Response.json({ error: 'unknown product' }, { status: 404 });

  const buyer = db.users[persona];
  const policy = getPolicy(buyer);
  const allowed =
    payingFor != null
      ? db.users[payingFor]?.parentId === persona && policy.band === 'adult'
      : product.subscription
        ? policy.canSubscribe
        : policy.purchase === 'free' || (policy.purchase === 'limit' && product.priceUsd <= (policy.purchaseLimitUsd ?? 0));
  if (!allowed)
    return Response.json({ error: 'k-ID rules: this purchase needs a parent', needsParent: true }, { status: 403 });

  const session = await fastspringSession(productId).catch(() => null);
  if (session) return Response.json({ url: session, via: 'fastspring' });
  const base = process.env.FASTSPRING_TEST_PRODUCT_BASE;
  if (base) return Response.json({ url: `${base.replace(/\/?$/, '/')}${productId}`, via: 'fastspring' });
  return Response.json({ url: null, via: 'simulated' });
}
