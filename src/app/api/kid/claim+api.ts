// Redeems the one-time claimToken from <KidSessionProvider onClaim> with the k-ID SECRET key,
// so the server (not the client) holds the authoritative age-gate result.
import type { Country, KidPerm, PersonaId } from '@/lib/types';
import { mutate } from '@/server/db';

export async function POST(request: Request) {
  const { persona, country, claimToken } = (await request.json()) as {
    persona: PersonaId;
    country: Country;
    claimToken: string;
  };
  const base = process.env.KID_API_BASE ?? 'https://kai-api.test.k-id.com/api/v1';
  const secret = process.env.KID_SECRET_KEY;
  if (!secret) return Response.json({ ok: false, error: 'KID_SECRET_KEY missing' }, { status: 500 });

  const res = await fetch(`${base}/client/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimToken }),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[k-ID claim]', res.status, JSON.stringify(data).slice(0, 1500));
  if (!res.ok) return Response.json({ ok: false, status: res.status, data }, { status: 502 });

  // Accept either { session: {...} } or a flat session object.
  const s = (data.session ?? data) as {
    sessionId?: string;
    ageStatus?: string;
    jurisdiction?: string;
    permissions?: KidPerm[];
    status?: string;
  };
  mutate((db) => {
    const u = db.users[persona];
    const prev = u.kid[country] ?? { updatedAt: 0 };
    u.kid[country] = {
      ...prev,
      sessionId: s.sessionId ?? prev.sessionId,
      ageStatus: s.ageStatus ?? prev.ageStatus,
      jurisdiction: s.jurisdiction ?? prev.jurisdiction,
      permissions: s.permissions ?? prev.permissions,
      source: s.permissions ? 'claim' : prev.source,
      claimedAt: Date.now(),
      updatedAt: Date.now(),
    };
  });
  return Response.json({ ok: true, data });
}
