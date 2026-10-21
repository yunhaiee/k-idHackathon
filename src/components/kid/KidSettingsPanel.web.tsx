// k-ID's own permission menu. Player-managed toggles flip instantly; guardian-managed ones email the
// grown-up for approval. Every change is mirrored to our server so all devices re-render.
import { KidSettings, KidSettingsProvider, useKidPermissionSettings } from '@k-id/core';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { KidRoot } from '@/components/kid/KidRoot';
import { Note } from '@/components/ui';
import { act } from '@/lib/api';
import type { Country, KidPerm, KidRecord, User } from '@/lib/types';

export function KidSettingsPanel({ user, country, rec }: { user: User; country: Country; rec?: KidRecord }) {
  if (!rec?.sessionId) return <Note tone="warn" title="No k-ID session yet">Finish the age check first.</Note>;
  return (
    <KidRoot country={country}>
      <KidSettingsProvider
        sessionId={rec.sessionId}
        challengeId={rec.settingsChallengeId}
        onChallenge={(settingsChallengeId) =>
          act({ action: 'kidUpdate', persona: user.id, country, patch: { settingsChallengeId } })
        }>
        <View style={{ gap: 12 }}>
          <KidSettings />
          <Mirror user={user} country={country} />
        </View>
      </KidSettingsProvider>
    </KidRoot>
  );
}

function Mirror({ user, country }: { user: User; country: Country }) {
  const { permissions } = useKidPermissionSettings();
  const last = useRef('');
  useEffect(() => {
    if (!permissions?.length) return;
    const perms: KidPerm[] = permissions.map((p) => ({ name: p.name, enabled: p.enabled, managedBy: p.managedBy }));
    const key = JSON.stringify(perms);
    if (key === last.current) return;
    last.current = key;
    void act({ action: 'kidUpdate', persona: user.id, country, patch: { permissions: perms } });
  }, [permissions, user.id, country]);
  return null;
}
