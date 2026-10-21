/// <reference types="node" />
// Gemini via REST. Primary model from .env, one fallback model, 12s timeout each, JSON output.
type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

async function call(model: string, parts: Part[], schema: object, timeoutMs: number) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${model} ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
    const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    return JSON.parse(text);
  } finally {
    clearTimeout(t);
  }
}

export async function geminiJSON<T>(parts: Part[], schema: object): Promise<{ data: T; model: string }> {
  // Only gemini-3.8-flash is open to new keys today, and it 503s under hackathon load: retry with backoff.
  const primary = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fallback = process.env.GEMINI_FALLBACK_MODEL;
  const plan = [primary, primary, primary, ...(fallback ? [fallback] : [])];
  let last: unknown;
  for (let i = 0; i < plan.length; i++) {
    try {
      return { data: (await call(plan[i], parts, schema, 12000)) as T, model: plan[i] };
    } catch (e) {
      last = e;
      console.warn(`[gemini] attempt ${i + 1} (${plan[i]}) failed:`, String(e).slice(0, 160));
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw last;
}
