// Labeled fallback only, for when k-ID is unreachable. Mirrors k-ID's shape so getPolicy is unchanged.
import { KID_PERMISSIONS } from './policy';
import type { Country, KidPerm, KidRecord } from './types';

const CONSENT_AGE: Record<Country, number> = { US: 13, DE: 16, GB: 13, KR: 14 };

export function simulatedKid(age: number, country: Country): Partial<KidRecord> {
  const consent = CONSENT_AGE[country];
  const minor = age < consent;
  const permissions: KidPerm[] = KID_PERMISSIONS.map((name) => ({
    name,
    enabled: !minor || name === 'custom-username',
    managedBy: minor ? 'GUARDIAN' : 'PLAYER',
  }));
  return {
    status: 'pass',
    age,
    permissions,
    requirements: { digitalConsentAge: consent, civilAge: 18 },
    source: 'simulated',
  };
}
