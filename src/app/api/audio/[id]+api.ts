/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';

export function GET(_request: Request, { id }: Record<string, string>) {
  const safe = id.replace(/[^\w.-]/g, '');
  const file = path.join(process.cwd(), 'data', 'audio', safe);
  if (!fs.existsSync(file)) return new Response('not found', { status: 404 });
  const type = safe.endsWith('.webm') ? 'audio/webm' : 'audio/mp4';
  return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { 'Content-Type': type } });
}
