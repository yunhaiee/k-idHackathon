/// <reference types="node" />
// One JSON-producing AI call for the whole app. Providers are tried in AI_ORDER (default claude,gemini);
// the caller supplies a labeled simulated result if every provider fails.
import Anthropic from '@anthropic-ai/sdk';

import { geminiJSON } from './gemini';

export type AIInput = { text: string; imageBase64?: string; mimeType?: string };
export type AIResult<T> = { data: T; model: string };

type JSONSchema = { [k: string]: unknown };

/** Gemini's responseSchema wants upper-case types and no additionalProperties. */
function toGeminiSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(toGeminiSchema);
  if (!s || typeof s !== 'object') return s;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'additionalProperties') continue;
    out[k] = k === 'type' && typeof v === 'string' ? v.toUpperCase() : toGeminiSchema(v);
  }
  return out;
}

let client: Anthropic | null = null;

async function claudeJSON<T>(input: AIInput, schema: JSONSchema): Promise<AIResult<T>> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
  client ??= new Anthropic();
  const model = 'claude-opus-5-5';
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.imageBase64) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: (input.mimeType ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: input.imageBase64,
      },
    });
  }
  content.push({ type: 'text', text: input.text });
  const response = await client.beta.messages.create(
    {
      model,
      max_tokens: 2048,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content }],
    },
    { timeout: 20_000 },
  );
  if (response.stop_reason === 'refusal') throw new Error('claude refused');
  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return { data: JSON.parse(text) as T, model: response.model };
}

export async function aiJSON<T>(input: AIInput, schema: JSONSchema): Promise<AIResult<T>> {
  const order = (process.env.AI_ORDER || 'claude,gemini').split(',').map((s) => s.trim());
  let last: unknown;
  for (const provider of order) {
    try {
      if (provider === 'claude') return await claudeJSON<T>(input, schema);
      if (provider === 'gemini') {
        const parts = [
          ...(input.imageBase64
            ? [{ inline_data: { mime_type: input.mimeType ?? 'image/jpeg', data: input.imageBase64 } }]
            : []),
          { text: input.text },
        ];
        return await geminiJSON<T>(parts, toGeminiSchema(schema) as object);
      }
    } catch (e) {
      last = e;
      console.warn(`[ai] ${provider} failed:`, String(e).slice(0, 200));
    }
  }
  throw last ?? new Error('no AI provider configured');
}
