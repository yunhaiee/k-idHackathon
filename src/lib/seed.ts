import type { DB, PersonaId, Product, User } from './types';

const img = (set: string, n: number) => `https://images.pokemontcg.io/${set}/${n}_hires.png`;

// PersonaId in types.ts still lists the old cast (maya/jordan/mom). Until it's widened (NOTES_FOR_YUNHA.md),
// seed ids go through this cast. People and items only: every rule comes from k-ID via getPolicy.
const P = (id: string) => id as PersonaId;

/** Seeded user + the demo's credibility score (not in User yet; see NOTES_FOR_YUNHA.md). */
export type SeedUser = User & { credibility?: number };

/** Persona order for the switcher and the /demo phones. */
export const PERSONA_ORDER = ['maya', 'leo', 'devon', 'anna'].map(P);

/** The /demo scenario: who sends the lowball, on which card, and which phones sit side by side. */
export const DEMO = {
  sender: P('devon'),
  card: 'Charizard',
  cashUsd: 20,
  /** Each entry is one phone frame; a pair shares a frame with a toggle. */
  phones: [[P('maya')], [P('leo')], [P('devon'), P('anna')]],
};

/** Listed cards whose price came from the AI price check ("Priced by AI"). */
export const AI_PRICED_CARD_IDS = ['c-charizard-maya', 'c-charizard-leo'];

export const PRODUCTS: Product[] = [
  { id: 'holo-binder-theme', name: 'Holo Binder Theme', priceUsd: 4.99, blurb: 'A shiny holo look for your binder. Digital item.' },
  { id: 'digital-slab', name: 'Digital Slab', priceUsd: 4.99, blurb: 'Show off one card in a graded-style case.' },
  { id: 'safe-trade-protection', name: 'Safe Trade Protection', priceUsd: 1.99, blurb: 'Tracked shipping and a trade guarantee.' },
  { id: 'collector-pro', name: 'Collector Pro+', priceUsd: 7.99, subscription: true, blurb: 'Market history, price alerts, bulk listing.' },
];

export function seedDB(): DB {
  const now = Date.now();
  const users: Record<string, SeedUser> = {
    maya: { id: P('maya'), name: 'Maya', age: 14, country: 'US', kid: {} },
    leo: { id: P('leo'), name: 'Leo', age: 14, country: 'DE', parentId: P('anna'), kid: {} },
    anna: { id: P('anna'), name: 'Anna', age: 42, country: 'DE', kid: {} },
    devon: { id: P('devon'), name: 'Devon', age: 25, country: 'US', credibility: 62, kid: {} },
  };
  return {
    version: 1,
    users: users as unknown as DB['users'],
    cards: [
      { id: 'c-charizard-maya', name: 'Charizard', set: 'Base Set', number: '4/102', priceUsd: 70, image: img('base1', 4), ownerId: P('maya') },
      { id: 'c-snorlax', name: 'Snorlax', set: 'Jungle', number: '11/64', priceUsd: 28, image: img('base2', 11), ownerId: P('maya') },
      { id: 'c-charizard-leo', name: 'Charizard', set: 'Evolutions', number: '11/108', priceUsd: 70, image: img('xy12', 11), ownerId: P('leo') },
      { id: 'c-pikachu', name: 'Pikachu', set: 'Base Set', number: '58/102', priceUsd: 12, image: img('base1', 58), ownerId: P('leo') },
      { id: 'c-gengar', name: 'Gengar', set: 'Fossil', number: '5/62', priceUsd: 48, image: img('base3', 5), ownerId: P('devon') },
      { id: 'c-eevee', name: 'Eevee', set: 'Jungle', number: '51/64', priceUsd: 6, image: img('base2', 51), ownerId: P('devon') },
      { id: 'c-blastoise', name: 'Blastoise', set: 'Base Set', number: '2/102', priceUsd: 95, image: img('base1', 2), ownerId: P('anna') },
    ],
    listings: [
      { id: 'l-charizard-maya', cardId: 'c-charizard-maya', sellerId: P('maya'), createdAt: now - 2000 },
      { id: 'l-charizard-leo', cardId: 'c-charizard-leo', sellerId: P('leo'), createdAt: now - 1000 },
    ],
    offers: [],
    messages: [],
    alerts: [],
    requests: [],
    purchases: [],
  };
}
