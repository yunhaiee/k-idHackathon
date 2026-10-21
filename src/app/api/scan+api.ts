// Card photo → Gemini: identify, estimate price, flag anything that looks off. Never claims "authentic".
import type { ScanResult } from '@/lib/types';
import { geminiJSON } from '@/server/gemini';



const SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    set: { type: 'STRING' },
    number: { type: 'STRING' },
    estimatedPriceUsd: { type: 'NUMBER' },
    fakeRisk: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    reasons: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['name', 'set', 'number', 'estimatedPriceUsd', 'fakeRisk', 'reasons'],
};

const PROMPT = `You are a trading-card grader's assistant. Identify the card in the photo.
Return its name, set, collector number, a realistic USD market price for an ungraded near-mint copy,
and fakeRisk (low/medium/high) with 1-3 short reasons based on what you can see (print quality, font,
holo pattern, color, edges). You cannot prove authenticity from a photo; only flag what looks off.`;

const SIMULATED: ScanResult = {
  name: 'Mewtwo',
  set: 'Base Set',
  number: '10/102',
  estimatedPriceUsd: 55,
  fakeRisk: 'low',
  reasons: ['Simulated result: Gemini was unavailable'],
  simulated: true,
};

export async function POST(request: Request) {
  const body = (await request.json()) as { imageBase64?: string; mimeType?: string; sampleUrl?: string };
  let data = body.imageBase64;
  let mime = body.mimeType ?? 'image/jpeg';
  try {
    if (!data && body.sampleUrl) {
      const img = await fetch(body.sampleUrl);
      mime = img.headers.get('content-type') ?? 'image/png';
      data = Buffer.from(await img.arrayBuffer()).toString('base64');
    }
    if (!data) return Response.json({ error: 'no image' }, { status: 400 });
    const { data: result, model } = await geminiJSON<ScanResult>(
      [{ inline_data: { mime_type: mime, data } }, { text: PROMPT }],
      SCHEMA,
    );
    return Response.json({ ...result, model });
  } catch (e) {
    console.warn('[scan] falling back to simulated:', String(e).slice(0, 300));
    return Response.json(SIMULATED);
  }
}
