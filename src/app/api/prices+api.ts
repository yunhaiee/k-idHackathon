// POST /api/prices: refresh every card's price from real TCGplayer market data (Pokémon TCG API).
import { refreshPrices } from '@/server/prices';

export async function POST() {
  return Response.json(await refreshPrices());
}
