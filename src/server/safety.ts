/// <reference types="node" />
// Message safety: fast deterministic rules first, then an AI second opinion. Shared by text and voice.
import type { Risk } from '@/lib/types';

import { aiJSON } from './ai';

const RULES: { re: RegExp; reason: string }[] = [
  { re: /(\+?\d[\d\s().-]{6,}\d)|(\b(five|six|seven|eight|nine|zero|one|two|three|four)(\s+(five|six|seven|eight|nine|zero|one|two|three|four)){5,})/i, reason: 'Shares a phone number' },
  { re: /<pii:phone>/i, reason: 'Shares a phone number' },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/, reason: 'Shares an email address' },
  { re: /https?:\/\/|www\.|\.(com|gg|io|me)\b/i, reason: 'Sends a link' },
  { re: /\b(text|dm|message|call|snap|add)\s+me\b|whats\s?app|discord|snapchat|insta(gram)?|telegram/i, reason: 'Asks to move off Kardza' },
  { re: /\b(don'?t|do not)\s+tell\b|\bour secret\b|\bkeep (it|this) (a )?secret\b/i, reason: 'Asks to keep a secret from a parent' },
  { re: /\bmeet\b|\bafter school\b|\bpick (it|you) up\b|\bcome over\b/i, reason: 'Asks to meet in person' },
  { re: /\b(gift ?card|venmo|cash ?app|paypal|zelle)\b/i, reason: 'Asks for payment outside Kardza' },
];

export function ruleCheck(text: string): string[] {
  const hits = new Set<string>();
  for (const r of RULES) if (r.re.test(text)) hits.add(r.reason);
  return [...hits];
}

/** Replace Modulate <pii:kind>…</pii:kind> tags and raw phone numbers/emails with placeholders. */
export function redact(text: string): string {
  return text
    .replace(/<pii:(\w+)>.*?<\/pii:\1>/gi, (_m, kind: string) => `[${kind} hidden]`)
    .replace(/(\+?\d[\d\s().-]{6,}\d)/g, '[phone hidden]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email hidden]');
}

export const stripTags = (text: string) => text.replace(/<\/?pii:\w+>/gi, '');

const SCHEMA = {
  type: 'object',
  properties: {
    level: { type: 'string', enum: ['none', 'low', 'high'] },
    reasons: { type: 'array', items: { type: 'string' } },
  },
  required: ['level', 'reasons'],
  additionalProperties: false,
};

/** Rules decide instantly; the AI can only raise the level, never lower a rule hit. */
export async function assessText(text: string): Promise<Risk & { model?: string }> {
  const rules = ruleCheck(text);
  let level: Risk['level'] = rules.length ? 'high' : 'none';
  let reasons = rules;
  let model: string | undefined;
  try {
    const ai = await aiJSON<Risk>(
      {
        text: `You screen chat messages on a trading-card marketplace used by children.
Rate this message: "high" if it tries to move the chat off-platform, shares contact info, asks for secrecy,
proposes meeting, pressures or scams; "low" if mildly pushy; else "none". Give short plain reasons (max 8 words each).
Message: """${text.slice(0, 1000)}"""`,
      },
      SCHEMA,
    );
    model = ai.model;
    const rank = { none: 0, low: 1, high: 2 } as const;
    if (rank[ai.data.level] > rank[level]) level = ai.data.level;
    reasons = [...new Set([...reasons, ...ai.data.reasons])].slice(0, 4);
  } catch (e) {
    console.warn('[safety] AI check skipped:', String(e).slice(0, 120));
  }
  return { level, reasons, model };
}
