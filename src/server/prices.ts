/// <reference types="node" />
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
