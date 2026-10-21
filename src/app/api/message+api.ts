// Text message on an offer: rules + AI second opinion, then stored. What each viewer sees is decided
// client-side by getPolicy; parents of kid receivers get the reason only.
import type { PersonaId } from '@/lib/types';
import { mutate, uid } from '@/server/db';
import { assessText } from '@/server/safety';
import { deliverMessage } from '@/server/trade';

export async function POST(request: Request) {
  const { offerId, fromId, text } = (await request.json()) as { offerId: string; fromId: PersonaId; text: string };
  const risk = await assessText(text);
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
