import type { DB, Product } from './types';

const img = (set: string, n: number) => `https://images.pokemontcg.io/${set}/${n}_hires.png`;

export const PRODUCTS: Product[] = [
  { id: 'holo-binder-theme', name: 'Holo Binder Theme', priceUsd: 2.99, blurb: 'A shiny look for your binder.' },
  { id: 'digital-slab', name: 'Digital Slab', priceUsd: 4.99, blurb: 'Show off one card in a graded-style case.' },
  { id: 'safe-trade-protection', name: 'Safe Trade Protection', priceUsd: 1.99, blurb: 'Tracked shipping and a trade guarantee.' },
  { id: 'collector-pro', name: 'Collector Pro+', priceUsd: 7.99, subscription: true, blurb: 'Market history, price alerts, bulk listing.' },
];

export function seedDB(): DB {
  const now = Date.now();
  return {
    version: 1,
    users: {
      maya: { id: 'maya', name: 'Maya', age: 11, country: 'US', parentId: 'mom', liveSignup: true, kid: {} },
      jordan: { id: 'jordan', name: 'Jordan', age: 15, country: 'US', kid: {} },
      mom: { id: 'mom', name: 'Alex', age: 41, country: 'US', kid: {} },
    },
    cards: [
      { id: 'c-mewtwo', name: 'Mewtwo', set: 'Base Set', number: '10/102', priceUsd: 55, image: img('base1', 10), ownerId: 'maya' },
      { id: 'c-snorlax', name: 'Snorlax', set: 'Jungle', number: '11/64', priceUsd: 28, image: img('base2', 11), ownerId: 'maya' },
      { id: 'c-pikachu', name: 'Pikachu', set: 'Base Set', number: '58/102', priceUsd: 12, image: img('base1', 58), ownerId: 'jordan' },
      { id: 'c-eevee', name: 'Eevee', set: 'Jungle', number: '51/64', priceUsd: 6, image: img('base2', 51), ownerId: 'jordan' },
      { id: 'c-gengar', name: 'Gengar', set: 'Fossil', number: '5/62', priceUsd: 48, image: img('base3', 5), ownerId: 'jordan' },
      { id: 'c-charizard', name: 'Charizard', set: 'Base Set', number: '4/102', priceUsd: 320, image: img('base1', 4), ownerId: 'mom' },
      { id: 'c-blastoise', name: 'Blastoise', set: 'Base Set', number: '2/102', priceUsd: 95, image: img('base1', 2), ownerId: 'mom' },
      { id: 'c-dragonite', name: 'Dragonite', set: 'Fossil', number: '4/62', priceUsd: 40, image: img('base3', 4), ownerId: 'mom' },
    ],
    listings: [
      { id: 'l-charizard', cardId: 'c-charizard', sellerId: 'mom', createdAt: now - 3000 },
      { id: 'l-mewtwo', cardId: 'c-mewtwo', sellerId: 'maya', createdAt: now - 2000 },
      { id: 'l-gengar', cardId: 'c-gengar', sellerId: 'jordan', createdAt: now - 1000 },
    ],
    offers: [],
    messages: [],
    alerts: [],
    requests: [],
    purchases: [],
  };
}
