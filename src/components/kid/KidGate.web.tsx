// Web: the real k-ID SDK (@k-id/core, React DOM). On iOS this same page is loaded in a WebView.
import {
  KidAskAnAdult,
  KidCollectAge,
  KidCoreProvider,
  KidSelectJurisdiction,
  KidSessionProvider,
  KidVerifyAge,
  useKidAgeGate,
  useKidSession,
} from '@k-id/core';
import { deDE, koKR } from '@k-id/core/localizations';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Btn, Eyebrow, H, Note, Txt } from '@/components/ui';
import { act, postJSON } from '@/lib/api';
import { COUNTRY_NAME, KID_PERMISSIONS } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { Country, KidRecord, User } from '@/lib/types';

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

function ageFromDob(dob?: string) {
  if (!dob) return undefined;
  const [y, m = '1', d = '1'] = dob.split('-');
  const b = new Date(Number(y), Number(m) - 1, Number(d));
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a -= 1;
  return a;
}

export function KidGate({ user, country, rec }: { user: User; country: Country; rec?: KidRecord }) {
  const report = (patch: Partial<KidRecord>) => act({ action: 'kidUpdate', persona: user.id, country, patch });
  const live = user.liveSignup && !rec?.sessionId;
  return (
    <KidCoreProvider
      publishableKey={process.env.EXPO_PUBLIC_KID_PUBLISHABLE_KEY!}
      baseUrl={process.env.EXPO_PUBLIC_KID_FAPI_BASE}
      declare={DECLARE}
      appearance={APPEARANCE}
      localization={LOCALE[country]}>
      <KidSessionProvider
        key={`${user.id}-${country}`}
        jurisdiction={live && country === 'US' ? 'auto' : country}
        age={user.liveSignup ? undefined : { age: user.age }}
        sessionId={rec?.sessionId}
        challengeId={rec?.challengeId}
        onSession={(sessionId) => report({ sessionId })}
        onChallenge={(challengeId) => report({ challengeId })}
        onClaim={(claimToken) =>
          void postJSON('/api/kid/claim', { persona: user.id, country, claimToken }).then((r) =>
            console.log('[k-ID claim result]', r),
          )
        }>
        <Flow user={user} country={country} rec={rec} report={report} />
      </KidSessionProvider>
    </KidCoreProvider>
  );
}

function Flow({
  user,
  country,
  rec,
  report,
}: {
  user: User;
  country: Country;
  rec?: KidRecord;
  report: (p: Partial<KidRecord>) => Promise<unknown>;
}) {
  const gate = useKidAgeGate();
  const { session } = useKidSession();
  const last = useRef('');

  useEffect(() => {
    const r = gate.requirements;
    const patch: Partial<KidRecord> = {
      status: gate.status,
      ...(r
        ? {
            requirements: {
              digitalConsentAge: r.digitalConsentAge,
              civilAge: r.civilAge,
              minimumAge: r.minimumAge,
              accessAge: r.accessAge,
            },
          }
        : {}),
      ...(session
        ? {
            permissions: session.permissions,
            ageStatus: session.ageStatus,
            jurisdiction: session.jurisdiction,
            ...(rec?.source === 'claim' ? {} : { source: 'client' as const }),
          }
        : {}),
      ...(user.liveSignup ? {} : { age: user.age }),
    };
    const key = JSON.stringify(patch);
    if (key === last.current) return;
    last.current = key;
    void report(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.status, gate.requirements, session]);

  const where = COUNTRY_NAME[country];
  const header = (
    <View style={{ gap: 6, marginBottom: 12 }}>
      <Eyebrow color={C.accent}>Age check by k-ID · {where}</Eyebrow>
      <H>{gate.status === 'pass' ? `You're in, ${user.name}` : `Hi ${user.name}, let's check in`}</H>
    </View>
  );

  switch (gate.status) {
    case 'running':
      return (
        <View>
          {header}
          <KidSelectJurisdiction />
          <KidCollectAge
            onSubmit={(s) => {
              const age = 'age' in s && s.age != null ? s.age : ageFromDob((s as { dateOfBirth?: string }).dateOfBirth);
              if (age != null) void report({ age });
            }}
          />
          <KidAskAnAdult />
          <KidVerifyAge />
        </View>
      );
    case 'pending':
      return (
        <View style={{ gap: 12 }}>
          {header}
          <Note tone="warn" title="Waiting for your grown-up">
            {`k-ID emailed your parent. Under ${gate.requirements?.digitalConsentAge ?? 'the consent age'} in ${where}, a parent says yes first. This screen opens by itself when they do.`}
          </Note>
        </View>
      );
    case 'pass':
      return (
        <View style={{ gap: 12 }}>
          {header}
          <Txt color={C.muted}>Opening Kardza…</Txt>
        </View>
      );
    case 'prohibited':
      return (
        <View style={{ gap: 12 }}>
          {header}
          <Note tone="danger" title="Kardza isn't available here yet">
            {`k-ID says ${where} needs players to be at least ${gate.requirements?.minimumAge ?? 'older'}.`}
          </Note>
        </View>
      );
    case 'fail':
      return (
        <View style={{ gap: 12 }}>
          {header}
          <Note tone="danger" title="Your grown-up said no, or the request expired" />
          <Btn label="Start over" kind="quiet" onPress={() => act({ action: 'kidForget', persona: user.id, country })} />
        </View>
      );
    default:
      return (
        <View style={{ gap: 12 }}>
          {header}
          <Note tone="danger" title="Couldn't reach k-ID">
            Check the connection, then start over.
          </Note>
          <Btn label="Start over" kind="quiet" onPress={() => act({ action: 'kidForget', persona: user.id, country })} />
        </View>
      );
  }
}
