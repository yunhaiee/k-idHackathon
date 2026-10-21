// Age-gated checkout. The k-ID-derived policy is checked HERE, on the server, before any FastSpring session
// is created. The parent is the buyer of record when paying for a child.
import { getPolicy } from '@/lib/policy';
import { PRODUCTS } from '@/lib/seed';
import type { PersonaId } from '@/lib/types';
import { readDB } from '@/server/db';
import { createSession } from '@/server/fastspring';

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

  try {
    const session = await createSession(persona, productId);
    return Response.json({ ...session, via: 'fastspring', since: Date.now() });
  } catch (e) {
    console.warn('[checkout] FastSpring unavailable, simulated:', String(e).slice(0, 200));
    return Response.json({ url: null, via: 'simulated' });
  }
}
