import { seedDB } from '@/lib/seed';
import type { Country, KidRecord, PersonaId } from '@/lib/types';
import { mutate, readDB, uid, writeDB } from '@/server/db';

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
    };

export async function POST(request: Request) {
  const body = (await request.json()) as Action;
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
    case 'kidForget':
      return Response.json(mutate((db) => void delete db.users[body.persona].kid[body.country]));
  }
  return Response.json({ error: 'unknown action' }, { status: 400 });
}
