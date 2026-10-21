/// <reference types="node" />
// Voice note → Modulate. Fast path (≈2s): transcript with PII tags, emotion, deepfake score → decide now.
// Slow path (≈18s): Velma Triage behaviors, added to the message and the parent alert when it lands.
import fs from 'node:fs';
import path from 'node:path';

import type { Message, PersonaId, Risk } from '@/lib/types';
import { mutate, uid } from '@/server/db';
import { transcribe, triage } from '@/server/modulate';
import { redact, ruleCheck, stripTags } from '@/server/safety';
import { deliverMessage } from '@/server/trade';

const SAMPLE = path.join(process.cwd(), 'assets', 'samples', 'voice-note.mp4');
const SIMULATED_SAMPLE =
  "Deal? It's a really good trade, trust me. Text me at <pii:phone>555 0134</pii:phone> and don't tell your mom, okay? We can meet after school.";

export async function POST(request: Request) {
  let offerId: string;
  let fromId: PersonaId;
  let audio: Buffer;
  let filename: string;
  let isSample = false;

  if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    const fd = (await request.formData()) as unknown as { get(k: string): unknown };
    offerId = String(fd.get('offerId'));
    fromId = String(fd.get('fromId')) as PersonaId;
    const file = fd.get('file') as File;
    audio = Buffer.from(await file.arrayBuffer());
    filename = file.name || 'voice.m4a';
  } else {
    const body = (await request.json()) as { offerId: string; fromId: PersonaId };
    offerId = body.offerId;
    fromId = body.fromId;
    audio = fs.readFileSync(SAMPLE);
    filename = 'voice-note.mp4';
    isSample = true;
  }

  const id = uid('m');
  const ext = path.extname(filename) || '.mp4';
  fs.mkdirSync(path.join(process.cwd(), 'data', 'audio'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'data', 'audio', `${id}${ext}`), audio);

  let tagged: string;
  let deepfake: number | undefined;
  let emotions: string[] = [];
  const checkedBy: string[] = [];
  try {
    const stt = await transcribe(audio, filename);
    tagged = stt.text;
    const scores = stt.utterances.map((u) => u.deepfake_score ?? 0);
    deepfake = scores.length ? Math.max(...scores) : undefined;
    emotions = [...new Set(stt.utterances.map((u) => u.emotion).filter((e): e is string => !!e && e !== 'Unknown'))];
    checkedBy.push('Modulate');
  } catch (e) {
    console.warn('[voice] Modulate failed:', String(e).slice(0, 200));
    tagged = isSample ? SIMULATED_SAMPLE : '';
    checkedBy.push('simulated');
  }

  const reasons = ruleCheck(tagged);
  if (deepfake != null && deepfake > 0.85) reasons.push(`Voice sounds AI-generated (Modulate ${Math.round(deepfake * 100)}%)`);
  const risk: Risk = tagged
    ? { level: reasons.some((r) => !r.startsWith('Voice sounds')) ? 'high' : reasons.length ? 'low' : 'none', reasons }
    : { level: 'high', reasons: ["We couldn't check this voice note"] };

  const msg: Message = {
    id,
    offerId,
    fromId,
    kind: 'voice',
    transcript: stripTags(tagged),
    redacted: redact(tagged),
    risk,
    deepfake,
    emotions,
    audioUrl: `/api/audio/${id}${ext}`,
    checkedBy,
    createdAt: Date.now(),
  };
  const db = mutate((d) => deliverMessage(d, msg));

  // Slow path: Velma behaviors. Not awaited; the clients pick it up on the next poll.
  if (checkedBy.includes('Modulate')) {
    void triage(audio, filename)
      .then((v) => {
        const found = (v.behaviors ?? []).filter((b) => b.detected);
        mutate((d) => {
          const m = d.messages.find((x) => x.id === id);
          if (!m) return;
          m.behaviors = found.map((b) => ({ name: b.behavior_name, confidence: b.confidence, reasoning: b.reasoning }));
          if (found.length && m.risk) {
            m.risk.level = 'high';
            m.risk.reasons = [...new Set([...m.risk.reasons, ...found.map((b) => b.behavior_name)])];
          }
          const alert = d.alerts.find((a) => a.messageId === id);
          if (alert && found.length) {
            alert.reason += ` Modulate Velma: ${found.map((b) => `${b.behavior_name} (${Math.round(b.confidence * 100)}%)`).join(', ')}.`;
          }
        });
      })
      .catch((e) => console.warn('[voice] Velma failed:', String(e).slice(0, 200)));
  }
  return Response.json(db);
}
