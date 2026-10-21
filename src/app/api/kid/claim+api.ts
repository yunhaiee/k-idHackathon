// Redeems the one-time claimToken from <KidSessionProvider onClaim> with the k-ID SECRET key,
// so the server (not the client) holds the authoritative age-gate result.
import type { Country, KidRecord, PersonaId } from '@/lib/types';
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

  // k-ID answers { sessionId, status: 'PASS' | 'PENDING' | ..., type: 'session' }. The server now knows
  // this session really passed; permissions are read by the SDK for that same verified session.
  const claim = data as { sessionId?: string; status?: string };
  const status = claim.status?.toLowerCase() as KidRecord['status'] | undefined;
  await mutate((db) => {
    const u = db.users[persona];
    const prev = u.kid[country] ?? { updatedAt: 0 };
    u.kid[country] = {
      ...prev,
      sessionId: claim.sessionId ?? prev.sessionId,
      ...(status ? { status } : {}),
      source: 'claim',
      claimedAt: Date.now(),
      updatedAt: Date.now(),
    };
  });
  return Response.json({ ok: true, data });
}
