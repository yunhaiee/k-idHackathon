import { loadAudio } from '@/server/db';

export async function GET(_request: Request, { id }: Record<string, string>) {
  const safe = id.replace(/[^\w.-]/g, '');
  const audio = await loadAudio(safe);
  if (!audio) return new Response('not found', { status: 404 });
  const type = safe.endsWith('.webm') ? 'audio/webm' : 'audio/mp4';
  return new Response(new Uint8Array(audio), { headers: { 'Content-Type': type } });
}
