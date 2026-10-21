import { seedDB } from '@/lib/seed';
import type { Country, KidRecord, PersonaId } from '@/lib/types';
import { runTask } from 'expo-server';

import { mutate, readDB, uid, writeDB } from '@/server/db';
import { applyPrices, refreshPrices } from '@/server/prices';
import { block, counterOffer, createOffer, parentDecision, parentReviewOffer, respondOffer } from '@/server/trade';

export async function GET(request: Request) {
  const since = Number(new URL(request.url).searchParams.get('v') ?? 0);
  const db = await readDB();
  if (since && since === db.version) return new Response(null, { status: 204 });
  return Response.json(db);
}

type Action =
  | { action: 'reset' }
  | { action: 'setCountry'; persona: PersonaId; country: Country }
  | { action: 'kidUpdate'; persona: PersonaId; country: Country; patch: Partial<KidRecord> }
  | { action: 'kidForget'; persona: PersonaId; country: Country }
  | {
      action: 'listScanned';
      persona: PersonaId;
      card: { name: string; set: string; number: string; priceUsd: number; image: string };
    }
  | { action: 'createOffer'; listingId: string; fromId: PersonaId; offeredCardIds: string[]; cashUsd?: number }
  | { action: 'counterOffer'; offerId: string; by: PersonaId; cashUsd: number }
  | { action: 'parentReviewOffer'; offerId: string; by: PersonaId; approve: boolean }
  | { action: 'block'; by: PersonaId; childId: PersonaId; blockedId: PersonaId }
  | { action: 'respondOffer'; offerId: string; by: PersonaId; accept: boolean }
  | { action: 'parentDecision'; requestId: string; approve: boolean }
  | { action: 'readAlert'; alertId: string }
  | { action: 'requestPurchase'; persona: PersonaId; productId: string }
  | {
      action: 'recordPurchase';
      persona: PersonaId;
      productId: string;
      via: 'fastspring' | 'simulated';
      requestId?: string;
      orderId?: string;
    };

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as Action;
  try {
    return await handle(body);
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e) }, { status: 400 });
  }
}

async function handle(body: Action): Promise<Response> {
  switch (body.action) {
    case 'reset': {
      // Keep k-ID sessions for pre-onboarded personas (Jordan's guardian approval survives a rehearsal);
      // only the live sign-up persona (Maya) starts over.
      const prev = await readDB();
      const db = seedDB();
      db.version = prev.version + 1;
      for (const u of Object.values(db.users))
        if (!u.liveSignup && prev.users[u.id]?.age === u.age) u.kid = prev.users[u.id].kid ?? {};
      // Real prices: apply the last good ones now, then refresh from TCGplayer in the background.
      db.priceCache = prev.priceCache;
      applyPrices(db);
      await writeDB(db);
      runTask(() => refreshPrices().catch((e) => console.warn('[prices] refresh failed', String(e))));
      return Response.json(db);
    }
    case 'setCountry':
      return Response.json(await mutate((db) => void (db.users[body.persona].country = body.country)));
    case 'kidUpdate':
      return Response.json(
        await mutate((db) => {
          const u = db.users[body.persona];
          const prev = u.kid[body.country];
          const patch = { ...body.patch };
          if (prev?.source === 'claim' && patch.source === 'client') delete patch.source;
          u.kid[body.country] = { ...prev, ...patch, updatedAt: Date.now() };
        }),
      );
    case 'listScanned':
      return Response.json(
        await mutate((db) => {
          const id = uid('c');
          db.cards.push({ id, ownerId: body.persona, ...body.card });
          db.listings.unshift({ id: uid('l'), cardId: id, sellerId: body.persona, createdAt: Date.now() });
        }),
      );
    case 'createOffer':
      return Response.json(
        await mutate((db) => void createOffer(db, body.listingId, body.fromId, body.offeredCardIds, body.cashUsd)),
      );
    case 'counterOffer':
      return Response.json(await mutate((db) => counterOffer(db, body.offerId, body.by, body.cashUsd)));
    case 'parentReviewOffer':
      return Response.json(await mutate((db) => parentReviewOffer(db, body.offerId, body.by, body.approve)));
    case 'block':
      return Response.json(await mutate((db) => block(db, body.by, body.childId, body.blockedId)));
    case 'respondOffer':
      return Response.json(await mutate((db) => respondOffer(db, body.offerId, body.by, body.accept)));
    case 'parentDecision':
      return Response.json(await mutate((db) => parentDecision(db, body.requestId, body.approve)));
    case 'readAlert':
      return Response.json(
        await mutate((db) => {
          const a = db.alerts.find((x) => x.id === body.alertId);
          if (a) a.read = true;
        }),
      );
    case 'requestPurchase':
      return Response.json(
        await mutate((db) => {
          const u = db.users[body.persona];
          if (!u.parentId) throw new Error('no parent on file');
          db.requests.unshift({
            id: uid('r'),
            kind: 'purchase',
            childId: u.id,
            parentId: u.parentId,
            productId: body.productId,
            status: 'pending',
            createdAt: Date.now(),
          });
        }),
      );
    case 'recordPurchase':
      return Response.json(
        await mutate((db) => {
          db.purchases.unshift({
            id: uid('p'),
            userId: body.persona,
            productId: body.productId,
            via: body.via,
            orderId: body.orderId,
            createdAt: Date.now(),
          });
          const r = body.requestId ? db.requests.find((x) => x.id === body.requestId) : undefined;
          if (r) r.status = 'paid';
        }),
      );
    case 'kidForget':
      return Response.json(await mutate((db) => void delete db.users[body.persona].kid[body.country]));
  }
  return Response.json({ error: 'unknown action' }, { status: 400 });
}
