// One <KidCoreProvider> config for every k-ID surface (gate + settings). Web-only: imported only by *.web.tsx.
import { KidCoreProvider } from '@k-id/core';
import { deDE, koKR } from '@k-id/core/localizations';
import type { ReactNode } from 'react';

import { KID_PERMISSIONS } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { Country } from '@/lib/types';

const DECLARE = {
  permissions: KID_PERMISSIONS.map((name) => ({ name })),
  supportEmail: 'yunhalee@stanford.edu',
  iconUrl: '/icon.png',
};

const APPEARANCE = {
  variables: {
    colorPrimary: C.accent,
    colorOnPrimary: '#ffffff',
    colorText: C.text,
    colorTextMuted: C.muted,
    colorSurface: C.surface,
    colorSurfaceMuted: C.surface2,
    colorBorder: C.line,
    colorDanger: C.danger,
    fontFamily: 'Inter, system-ui, sans-serif',
    radius: '14px',
  },
};

const LOCALE: Partial<Record<Country, typeof deDE>> = { DE: deDE, KR: koKR };

export function KidRoot({ country, children }: { country: Country; children: ReactNode }) {
  return (
    <KidCoreProvider
      publishableKey={process.env.EXPO_PUBLIC_KID_PUBLISHABLE_KEY!}
      baseUrl={process.env.EXPO_PUBLIC_KID_FAPI_BASE}
      declare={DECLARE}
      appearance={APPEARANCE}
      localization={LOCALE[country]}>
      {children}
    </KidCoreProvider>
  );
}
