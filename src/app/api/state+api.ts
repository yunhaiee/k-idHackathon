import { seedDB } from '@/lib/seed';
import type { Country, KidRecord, PersonaId } from '@/lib/types';
import { mutate, readDB, uid, writeDB } from '@/server/db';
import { createOffer, parentDecision, respondOffer } from '@/server/trade';

export function GET(request: Request) {
  const since = Number(new URL(request.url).searchParams.get('v') ?? 0);
  const db = readDB();
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
  | { action: 'createOffer'; listingId: string; fromId: PersonaId; offeredCardIds: string[] }
  | { action: 'respondOffer'; offerId: string; by: PersonaId; accept: boolean }
  | { action: 'parentDecision'; requestId: string; approve: boolean }
  | { action: 'readAlert'; alertId: string };

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as Action;
  try {
    return handle(body);
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e) }, { status: 400 });
  }
}

function handle(body: Action): Response {
  switch (body.action) {
    case 'reset': {
      const db = seedDB();
      db.version = readDB().version + 1;
      writeDB(db);
      return Response.json(db);
    }
    case 'setCountry':
      return Response.json(mutate((db) => void (db.users[body.persona].country = body.country)));
    case 'kidUpdate':
      return Response.json(
        mutate((db) => {
          const u = db.users[body.persona];
          const prev = u.kid[body.country];
          const patch = { ...body.patch };
          if (prev?.source === 'claim' && patch.source === 'client') delete patch.source;
          u.kid[body.country] = { ...prev, ...patch, updatedAt: Date.now() };
        }),
      );
    case 'listScanned':
      return Response.json(
        mutate((db) => {
          const id = uid('c');
          db.cards.push({ id, ownerId: body.persona, ...body.card });
          db.listings.unshift({ id: uid('l'), cardId: id, sellerId: body.persona, createdAt: Date.now() });
        }),
      );
    case 'createOffer':
      return Response.json(mutate((db) => void createOffer(db, body.listingId, body.fromId, body.offeredCardIds)));
    case 'respondOffer':
      return Response.json(mutate((db) => respondOffer(db, body.offerId, body.by, body.accept)));
    case 'parentDecision':
      return Response.json(mutate((db) => parentDecision(db, body.requestId, body.approve)));
    case 'readAlert':
      return Response.json(
        mutate((db) => {
          const a = db.alerts.find((x) => x.id === body.alertId);
          if (a) a.read = true;
        }),
      );
    case 'kidForget':
      return Response.json(mutate((db) => void delete db.users[body.persona].kid[body.country]));
  }
  return Response.json({ error: 'unknown action' }, { status: 400 });
}
