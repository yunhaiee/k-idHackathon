import { seedDB } from '@/lib/seed';
import type { Country, KidRecord, PersonaId } from '@/lib/types';
import { mutate, readDB, writeDB } from '@/server/db';

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
  | { action: 'kidForget'; persona: PersonaId; country: Country };

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
          u.kid[body.country] = { ...u.kid[body.country], ...body.patch, updatedAt: Date.now() };
        }),
      );
    case 'kidForget':
      return Response.json(mutate((db) => void delete db.users[body.persona].kid[body.country]));
  }
  return Response.json({ error: 'unknown action' }, { status: 400 });
}
