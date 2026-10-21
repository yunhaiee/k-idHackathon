// getPolicy(user): the ONLY place behavior is decided. Features read these fields, never age.
// Source of truth: the user's k-ID session for their current country (permissions + requirements).
import type { Country, KidPerm, KidRecord, User } from './types';

export const COUNTRY_NAME: Record<Country, string> = {
  US: 'United States',
  DE: 'Germany',
  GB: 'United Kingdom',
  KR: 'South Korea',
};

/** The k-ID permissions Kardza declares, one per real feature. */
export const KID_PERMISSIONS = [
  'in-game-purchases',
  'virtual-property-ownership',
  'text-chat-private',
  'voice-chat',
  'camera-access',
  'ai-media-upload',
  'custom-username',
] as const;
export type KidPermName = (typeof KID_PERMISSIONS)[number];

export const PERM_LABEL: Record<KidPermName, string> = {
  'in-game-purchases': 'Buying in the Shop',
  'virtual-property-ownership': 'Trading cards',
  'text-chat-private': 'Messages',
  'voice-chat': 'Voice notes',
  'camera-access': 'Camera',
  'ai-media-upload': 'Photo to AI',
  'custom-username': 'Custom username',
};

export type Access = 'on' | 'parent' | 'off';
export type Band = 'kid' | 'teen' | 'adult';

export type Policy = {
  ready: boolean;
  status: KidRecord['status'] | 'none';
  band: Band;
  age: number;
  country: Country;
  countryName: string;
  consentAge?: number;
  civilAge?: number;
  access: Record<KidPermName, Access>;
  canScan: Access;
  priceView: 'plain' | 'range' | 'full';
  chatMode: 'none' | 'presets' | 'filtered' | 'open';
  voice: 'none' | 'hide-on-risk' | 'redact' | 'transcript+warning';
  tradeNeedsParent: boolean;
  canTrade: boolean;
  purchase: 'parent' | 'limit' | 'free' | 'off';
  purchaseLimitUsd: number | null;
  canSubscribe: boolean;
  bigUI: boolean;
  source?: KidRecord['source'];
  reasons: string[];
};

function accessOf(p?: KidPerm): Access {
  if (!p) return 'off';
  if (p.enabled) return 'on';
  if (p.managedBy === 'GUARDIAN') return 'parent';
  return 'off';
}

export function kidRecord(user: User): KidRecord | undefined {
  return user.kid[user.country];
}

export function getPolicy(user: User): Policy {
  const rec = kidRecord(user);
  const req = rec?.requirements ?? {};
  const age = rec?.age ?? user.age;
  const consentAge = req.digitalConsentAge;
  const civilAge = req.civilAge ?? 18;
  const band: Band = age < (consentAge ?? 13) ? 'kid' : age < civilAge ? 'teen' : 'adult';
  const perms = new Map((rec?.permissions ?? []).map((p) => [p.name, p]));
  const access = Object.fromEntries(KID_PERMISSIONS.map((n) => [n, accessOf(perms.get(n))])) as Record<
    KidPermName,
    Access
  >;
  const ready = rec?.status === 'pass' && !!rec.permissions;

  const canScan: Access =
    access['camera-access'] === 'off' || access['ai-media-upload'] === 'off'
      ? 'off'
      : access['camera-access'] === 'on' && access['ai-media-upload'] === 'on'
        ? 'on'
        : 'parent';

  const chat = access['text-chat-private'];
  const chatMode: Policy['chatMode'] =
    chat === 'off' ? 'none' : chat === 'parent' ? 'presets' : band === 'adult' ? 'open' : 'filtered';

  const voiceAccess = access['voice-chat'];
  const voice: Policy['voice'] =
    voiceAccess === 'off' && band !== 'kid'
      ? 'none'
      : band === 'kid'
        ? 'hide-on-risk'
        : band === 'teen'
          ? 'redact'
          : 'transcript+warning';

  const trade = access['virtual-property-ownership'];
  const buy = access['in-game-purchases'];
  const purchase: Policy['purchase'] =
    buy === 'off' ? 'off' : buy === 'parent' || band === 'kid' ? 'parent' : band === 'teen' ? 'limit' : 'free';

  const where = COUNTRY_NAME[user.country];
  const reasons: string[] = [];
  if (consentAge) reasons.push(`Digital consent age in ${where}: ${consentAge}. ${user.name} is ${age}.`);
  for (const n of KID_PERMISSIONS) {
    const a = access[n];
    reasons.push(
      `${PERM_LABEL[n]}: ${a === 'on' ? 'on' : a === 'parent' ? 'a parent decides' : 'not available'}`,
    );
  }

  return {
    ready,
    status: rec?.status ?? 'none',
    band,
    age,
    country: user.country,
    countryName: where,
    consentAge,
    civilAge,
    access,
    canScan,
    priceView: band === 'kid' ? 'plain' : band === 'teen' ? 'range' : 'full',
    chatMode,
    voice,
    canTrade: trade !== 'off',
    tradeNeedsParent: trade === 'parent' || band === 'kid',
    purchase,
    purchaseLimitUsd: purchase === 'limit' ? 5 : purchase === 'free' ? null : 0,
    canSubscribe: band === 'adult' && buy === 'on',
    bigUI: band === 'kid',
    source: rec?.source,
    reasons,
  };
}
