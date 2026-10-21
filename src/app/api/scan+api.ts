// Card photo → Gemini: identify, estimate price, flag anything that looks off. Never claims "authentic".
import type { ScanResult } from '@/lib/types';
import { aiJSON } from '@/server/ai';

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    set: { type: 'string' },
    number: { type: 'string' },
    estimatedPriceUsd: { type: 'number' },
    fakeRisk: { type: 'string', enum: ['low', 'medium', 'high'] },
    reasons: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'set', 'number', 'estimatedPriceUsd', 'fakeRisk', 'reasons'],
  additionalProperties: false,
};

const PROMPT = `You are a trading-card grader's assistant. Identify the card in the photo.
Return its name, set, collector number, and a realistic USD market price for an ungraded near-mint copy.
Assume the common Unlimited print unless a 1st Edition stamp is clearly visible.
fakeRisk is low/medium/high based only on what you can see (print quality, fonts, holo pattern, color, edges).
reasons: 1-2 plain sentences of at most 15 words each. A photo can't prove authenticity, so only flag what looks off.`;

const SIMULATED: ScanResult = {
  name: 'Mewtwo',
  set: 'Base Set',
  number: '10/102',
  estimatedPriceUsd: 55,
  fakeRisk: 'low',
  reasons: ['Simulated result: the AI service was unavailable'],
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
    const { data: result, model } = await aiJSON<ScanResult>(
      { text: PROMPT, imageBase64: data, mimeType: mime },
      SCHEMA,
    );
    return Response.json({ ...result, model });
  } catch (e) {
    console.warn('[scan] falling back to simulated:', String(e).slice(0, 300));
    return Response.json(SIMULATED);
  }
}
