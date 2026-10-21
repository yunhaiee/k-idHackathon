// Text message on an offer: rules + AI second opinion, then stored. What each viewer sees is decided
// client-side by getPolicy; parents of kid receivers get the reason only.
import type { PersonaId } from '@/lib/types';
import { mutate, uid } from '@/server/db';
import { assessText } from '@/server/safety';
import { deliverMessage } from '@/server/trade';

/** Recent checks by text, so "Send anyway" after a dry run doesn't call the AI twice. */
// On globalThis: the dev server re-evaluates route modules, which would empty a module-level map.
const g = globalThis as { kardzaTextChecks?: Map<string, { at: number; risk: Awaited<ReturnType<typeof assessText>> }> };
const checked = (g.kardzaTextChecks ??= new Map());

async function check(text: string) {
  const hit = checked.get(text);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.risk;
  const risk = await assessText(text);
  checked.set(text, { at: Date.now(), risk });
  return risk;
}

export async function POST(request: Request) {
  const { offerId, fromId, text, dryRun } = (await request.json()) as { offerId: string; fromId: PersonaId; text: string; dryRun?: boolean };
  const risk = await check(text);
  // Dry run: what Kardza Intelligence would say, without sending (the sender confirms a flagged message first).
  if (dryRun) return Response.json({ risk: { level: risk.level, reasons: risk.reasons } });
  const db = await mutate((d) =>
    deliverMessage(d, {
      id: uid('m'),
      offerId,
      fromId,
      kind: 'text',
      text,
      risk: { level: risk.level, reasons: risk.reasons },
      checkedBy: ['rules', ...(risk.model ? [risk.model] : [])],
      createdAt: Date.now(),
    }),
  );
  return Response.json(db);
}
