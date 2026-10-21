/// <reference types="node" />
// Modulate: fast STT with PII tags + emotion + deepfake (≈2s), and Velma Triage behaviors (≈18s, run async).
const BASE = 'https://platform.modulate.ai/api';

export type Utterance = { text: string; emotion?: string | null; deepfake_score?: number | null };
export type STT = { text: string; utterances: Utterance[] };
export type Behavior = { behavior_name: string; detected: boolean; confidence: number; reasoning?: string };
export type Velma = { behaviors: Behavior[]; summary?: string; topics?: string[] };

function form(audio: Buffer, filename: string, extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append('upload_file', new Blob([new Uint8Array(audio)]), filename);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return fd;
}

async function post<T>(path: string, fd: FormData, timeoutMs: number): Promise<T> {
  const key = process.env.MODULATE_API_KEY;
  if (!key) throw new Error('MODULATE_API_KEY missing');
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'X-API-Key': key },
    body: fd,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`modulate ${path} ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data as T;
}

/** Modulate rejects .m4a by name; it's the same container as .mp4. */
export const modulateName = (name: string) => name.replace(/\.m4a$/i, '.mp4');

export function transcribe(audio: Buffer, filename: string) {
  return post<STT>(
    'velma-2-stt-batch',
    form(audio, modulateName(filename), { emotion_signal: 'true', deepfake_signal: 'true', pii_phi_tagging: 'true' }),
    20000,
  );
}

export function triage(audio: Buffer, filename: string) {
  return post<Velma>('velma-2-batch', form(audio, modulateName(filename)), 45000);
}
