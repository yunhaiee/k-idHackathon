import { router } from 'expo-router';
import { View } from 'react-native';

import { KidSettingsPanel } from '@/components/kid/KidSettingsPanel';
import { TopBar } from '@/components/TopBar';
import { Btn, Eyebrow, H, Page, Txt } from '@/components/ui';
import { useDB } from '@/lib/api';
import { useDevice } from '@/lib/device';
import { COUNTRY_NAME } from '@/lib/policy';
import { C } from '@/lib/theme';

export default function Settings() {
  const db = useDB();
  const { persona } = useDevice();
  if (!db) return null;
  const user = db.users[persona];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar />
      <Page>
        <Btn label="Back" kind="quiet" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <Eyebrow color={C.accent}>Settings · k-ID</Eyebrow>
        <H>What {user.name} can do</H>
        <Txt color={C.muted}>
          Some features you can switch on yourself. Others need a grown-up: k-ID emails them and the feature
          opens here when they say yes. Rules for {COUNTRY_NAME[user.country]}.
        </Txt>
        <KidSettingsPanel key={`${user.id}-${user.country}`} user={user} country={user.country} rec={user.kid[user.country]} />
      </Page>
    </View>
  );
}
