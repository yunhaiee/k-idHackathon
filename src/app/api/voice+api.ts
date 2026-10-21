/// <reference types="node" />
// Voice note → Modulate. Fast path (≈2s): transcript with PII tags, emotion, deepfake score → decide now.
// Slow path (≈18s): Velma Triage behaviors, added to the message and the parent alert when it lands.
import { runTask } from 'expo-server';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Message, PersonaId, Risk } from '@/lib/types';
import { mutate, saveAudio, uid } from '@/server/db';
import { transcribe, triage } from '@/server/modulate';
import { redact, ruleCheck, stripTags } from '@/server/safety';
import { deliverMessage } from '@/server/trade';

const SAMPLE = path.join(process.cwd(), 'assets', 'samples', 'voice-note.mp4');
const SIMULATED_SAMPLE =
  "Deal? It's a really good trade, trust me. Text me at <pii:phone>555 0134</pii:phone> and don't tell your mom, okay? We can meet after school.";

/** Recent Modulate results by audio hash, so "Send anyway" after a dry run doesn't transcribe twice. */
type STTResult = { tagged: string; deepfake?: number; emotions: string[]; checkedBy: string[] };
// On globalThis: the dev server re-evaluates route modules, which would empty a module-level map.
const g = globalThis as { kardzaVoiceChecks?: Map<string, { at: number; result: STTResult }> };
const checked = (g.kardzaVoiceChecks ??= new Map());

export async function POST(request: Request) {
  let dryRun = false;
  let offerId: string;
  let fromId: PersonaId;
  let audio: Buffer;
  let filename: string;
  let isSample = false;

  if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    const fd = (await request.formData()) as unknown as { get(k: string): unknown };
    offerId = String(fd.get('offerId'));
    fromId = String(fd.get('fromId')) as PersonaId;
    dryRun = fd.get('dryRun') === '1';
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

  const key = crypto.createHash('sha1').update(audio).digest('hex');
  let stt = checked.get(key)?.result;
  if (!stt || Date.now() - checked.get(key)!.at > 10 * 60_000) {
    try {
      const r = await transcribe(audio, filename);
      const scores = r.utterances.map((u) => u.deepfake_score ?? 0);
      stt = {
        tagged: r.text,
        deepfake: scores.length ? Math.max(...scores) : undefined,
        emotions: [...new Set(r.utterances.map((u) => u.emotion).filter((e): e is string => !!e && e !== 'Unknown'))],
        checkedBy: ['Modulate'],
      };
      checked.set(key, { at: Date.now(), result: stt });
    } catch (e) {
      console.warn('[voice] Modulate failed:', String(e).slice(0, 200));
      stt = { tagged: isSample ? SIMULATED_SAMPLE : '', emotions: [], checkedBy: ['simulated'] };
    }
  }
  const { tagged, deepfake, emotions } = stt;
  const checkedBy = [...stt.checkedBy];

  const reasons = ruleCheck(tagged);
  if (deepfake != null && deepfake > 0.85) reasons.push(`Voice sounds AI-generated (Modulate ${Math.round(deepfake * 100)}%)`);
  const risk: Risk = tagged
    ? { level: reasons.some((r) => !r.startsWith('Voice sounds')) ? 'high' : reasons.length ? 'low' : 'none', reasons }
    : { level: 'high', reasons: ["We couldn't check this voice note"] };
  // Dry run: what Modulate + our rules would say, without sending (the sender confirms a flagged note first).
  if (dryRun) return Response.json({ risk });

  const id = uid('m');
  const ext = path.extname(filename) || '.mp4';
  await saveAudio(`${id}${ext}`, audio);

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
  const db = await mutate((d) => deliverMessage(d, msg));

  // Slow path: Velma behaviors. Not awaited (runTask keeps serverless alive); clients see it on the next poll.
  if (checkedBy.includes('Modulate')) {
    runTask(() => triage(audio, filename)
      .then(async (v) => {
        const found = (v.behaviors ?? []).filter((b) => b.detected);
        await mutate((d) => {
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
      .catch((e) => console.warn('[voice] Velma failed:', String(e).slice(0, 200))));
  }
  return Response.json(db);
}
