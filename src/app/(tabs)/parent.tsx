import { router } from 'expo-router';

import { Btn, Eyebrow, H, Page, Txt } from '@/components/ui';
import { useDB } from '@/lib/api';
import { useDevice } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { C } from '@/lib/theme';

export default function Me() {
  const db = useDB();
  const { persona } = useDevice();
  if (!db) return null;
  const me = db.users[persona];
  const policy = getPolicy(me);
  return (
    <Page>
      <Eyebrow>{persona === 'mom' ? 'Family' : 'Me'}</Eyebrow>
      <H>{me.name}</H>
      <Txt color={C.muted}>
        {policy.band === 'kid' ? 'Kid account' : policy.band === 'teen' ? 'Teen account' : 'Adult account'} ·{' '}
        {policy.countryName}
      </Txt>
      <Btn label="Permissions (k-ID settings)" kind="quiet" onPress={() => router.push('/settings')} />
    </Page>
  );
}
