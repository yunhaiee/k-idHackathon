/// <reference types="node" />
import { AI_PRICE_SOURCE } from '@/lib/seed';
import type { DB } from '@/lib/types';

import { mutate, readDB } from './db';

// Real market prices: TCGplayer data via the free Pokémon TCG API. Best effort (it rate-limits without a key),
// so callers keep the AI estimate when this returns null.
type Prices = Record<string, { market?: number | null; mid?: number | null }>;

const PREFERRED = ['holofoil', 'unlimitedHolofoil', 'normal', 'unlimited', 'reverseHolofoil', '1stEditionHolofoil', '1stEdition'];

export async function marketPrice(
  name: string,
  number: string,
  setName?: string,
): Promise<{ usd: number; updatedAt?: string; set?: string } | null> {
  const num = number.split('/')[0].trim();
  const q = `name:"${name.replace(/"/g, '')}" number:${num}`;
  try {
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&select=name,number,set,tcgplayer&pageSize=5`,
      {
        signal: AbortSignal.timeout(6000),
        headers: process.env.POKEMONTCG_API_KEY ? { 'X-Api-Key': process.env.POKEMONTCG_API_KEY } : {},
      },
    );
    if (!res.ok) return null;
    type Card = { set?: { name?: string }; tcgplayer?: { prices?: Prices; updatedAt?: string } };
    const data = (await res.json()) as { data?: Card[] };
    // Prefer the card whose set matches what the AI read ("Base Set" ~ "Base"), else take the first.
    const norm = (x?: string) => (x ?? '').toLowerCase().replace(/set|\(.*?\)|[^a-z0-9 ]/g, '').trim();
    const want = norm(setName);
    const cards = [...(data.data ?? [])].sort((a, b) => {
      const sa = norm(a.set?.name) === want ? 0 : 1;
      const sb = norm(b.set?.name) === want ? 0 : 1;
      return sa - sb;
    });
    for (const card of cards) {
      const prices = card.tcgplayer?.prices;
      if (!prices) continue;
      for (const k of PREFERRED) {
        const usd = prices[k]?.market ?? prices[k]?.mid;
        if (usd) return { usd, updatedAt: card.tcgplayer?.updatedAt, set: card.set?.name };
      }
    }
  } catch (e) {
    console.warn('[prices] lookup failed:', String(e).slice(0, 120));
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Look up real prices for every card (2 tries each, one at a time to stay under the API's rate limit). */
export async function lookupCardPrices(cards: { name: string; number: string; set: string }[]) {
  const found: Record<string, { usd: number; source: string }> = {};
  for (const c of cards) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const m = await marketPrice(c.name, c.number, c.set);
      if (m) {
        found[`${c.name}|${c.number}`] = {
          usd: Math.round(m.usd * 100) / 100,
          source: `TCGplayer market · ${m.set ?? c.set}${m.updatedAt ? ` · updated ${m.updatedAt}` : ''}`,
        };
        break;
      }
      await sleep(800);
    }
  }
  return found;
}

// Fresh results update the cache; cards the API misses keep their last good real price, else the seed estimate.
export function applyPrices(db: DB, fresh: Record<string, { usd: number; source: string }> = {}) {
  db.priceCache = { ...(db.priceCache ?? {}), ...fresh };
  for (const card of db.cards) {
    // Cards priced by Kardza's AI price check keep that price (the demo's ~$70 Charizards).
    if (card.priceSource === AI_PRICE_SOURCE) continue;
    const hit = db.priceCache[`${card.name}|${card.number}`];
    if (hit) {
      card.priceUsd = hit.usd;
      card.priceSource = hit.source;
    }
  }
}

export async function refreshPrices() {
  const db = await readDB();
  const fresh = await lookupCardPrices(db.cards.filter((c) => c.priceSource !== AI_PRICE_SOURCE));
  const updated = await mutate((d) => applyPrices(d, fresh));
  return { found: Object.keys(fresh).length, of: updated.cards.length };
}

