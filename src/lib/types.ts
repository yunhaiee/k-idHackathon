export type PersonaId = 'maya' | 'leo' | 'anna' | 'devon';
export type Country = 'US' | 'DE' | 'GB' | 'KR';

export type KidStatus = 'running' | 'pending' | 'pass' | 'prohibited' | 'fail' | 'error';

export type KidPerm = {
  name: string;
  enabled: boolean;
  managedBy?: 'PLAYER' | 'GUARDIAN' | 'PROHIBITED';
};

export type KidRequirements = {
  digitalConsentAge?: number;
  civilAge?: number;
  minimumAge?: number;
  accessAge?: number;
};

/** One k-ID session for one persona in one country. Written by the k-ID gate page and /api/kid/claim. */
export type KidRecord = {
  sessionId?: string;
  challengeId?: string;
  settingsChallengeId?: string;
  status?: KidStatus;
  age?: number;
  ageStatus?: string;
  jurisdiction?: string;
  permissions?: KidPerm[];
  requirements?: KidRequirements;
  /** 'claim' = redeemed server-side with the secret key; 'client' = reported by the SDK in the browser. */
  source?: 'claim' | 'client' | 'simulated';
  claimedAt?: number;
  updatedAt: number;
};

export type User = {
  id: PersonaId;
  name: string;
  age: number;
  country: Country;
  parentId?: PersonaId;
  /** Signs up live through the full k-ID widget (no age passed in). */
  liveSignup?: boolean;
  kid: Partial<Record<Country, KidRecord>>;
  /** Trust score shown on offers; lowered when one of their messages is blocked. */
  credibility?: number;
  /** Players this child's parent blocked: they can't send offers or messages to this user. */
  blocked?: PersonaId[];
  /** Object pronoun for parent alerts ("asking him…"); copy uses "them" when unset. */
  pronoun?: string;
};

export type Card = {
  id: string;
  name: string;
  set: string;
  number: string;
  priceUsd: number;
  image: string;
  ownerId: PersonaId;
  /** e.g. "TCGplayer market · Base · updated 2026/10/15"; absent = seed estimate. */
  priceSource?: string;
};

export type Listing = { id: string; cardId: string; sellerId: PersonaId; createdAt: number };

export type Offer = {
  id: string;
  listingId: string;
  fromId: PersonaId;
  toId: PersonaId;
  offeredCardIds: string[];
  /** Cash part of the offer, in USD. */
  cashUsd?: number;
  /** Receiver's counter, in cash (status 'countered'). */
  counterUsd?: number;
  /**
   * held = waiting for the receiver's parent to review it before the child sees anything;
   * needs-parent = the child agreed, the parent gives the final OK.
   */
  status: 'held' | 'pending' | 'countered' | 'needs-parent' | 'accepted' | 'declined';
  /** The receiver's parent let this offer through ("Let … see it"). */
  parentApproved?: boolean;
  createdAt: number;
};

export type Risk = { level: 'none' | 'low' | 'high'; reasons: string[] };

export type Message = {
  id: string;
  offerId: string;
  fromId: PersonaId;
  kind: 'text' | 'voice';
  text?: string;
  transcript?: string;
  redacted?: string;
  risk?: Risk;
  audioUrl?: string;
  /** Modulate signals (voice only). */
  deepfake?: number;
  emotions?: string[];
  behaviors?: { name: string; confidence: number; reasoning?: string }[];
  /** Which services checked it, for the UI ("Modulate", "Claude", "rules", "simulated"). */
  checkedBy?: string[];
  createdAt: number;
};

export type Alert = {
  id: string;
  parentId: PersonaId;
  childId: PersonaId;
  reason: string;
  messageId?: string;
  offerId?: string;
  createdAt: number;
  read?: boolean;
};

export type ParentRequest = {
  id: string;
  kind: 'purchase' | 'trade';
  childId: PersonaId;
  parentId: PersonaId;
  productId?: string;
  offerId?: string;
  status: 'pending' | 'approved' | 'declined' | 'paid';
  createdAt: number;
};

export type Purchase = {
  id: string;
  userId: PersonaId;
  productId: string;
  via: 'fastspring' | 'simulated';
  /** FastSpring order id, when the server verified the order with FastSpring. */
  orderId?: string;
  createdAt: number;
};

export type DB = {
  version: number;
  users: Record<PersonaId, User>;
  cards: Card[];
  listings: Listing[];
  offers: Offer[];
  messages: Message[];
  alerts: Alert[];
  requests: ParentRequest[];
  purchases: Purchase[];
  /** Last good real market prices by "name|number", reused when the price API is down. */
  priceCache?: Record<string, { usd: number; source: string }>;
};

export type Product = {
  id: string;
  name: string;
  priceUsd: number;
  subscription?: boolean;
  blurb: string;
};

export type ScanResult = {
  name: string;
  set: string;
  number: string;
  estimatedPriceUsd: number;
  fakeRisk: 'low' | 'medium' | 'high';
  reasons: string[];
  model?: string;
  simulated?: boolean;
  /** Where estimatedPriceUsd came from. */
  priceSource?: string;
};
