// k-ID settings as a standalone page (the iOS app loads it in a WebView).
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { KidSettingsPanel } from '@/components/kid/KidSettingsPanel';
import { Page } from '@/components/ui';
import { useDB } from '@/lib/api';
import { C } from '@/lib/theme';
import type { Country, PersonaId } from '@/lib/types';

export default function KidSettingsPage() {
  const { as, j } = useLocalSearchParams<{ as?: PersonaId; j?: Country }>();
  const db = useDB();
  if (!db) return <ActivityIndicator style={{ marginTop: 80 }} color={C.accent} />;
  const user = db.users[as ?? 'maya'];
  const country = j ?? user.country;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Page>
        <KidSettingsPanel key={`${user.id}-${country}`} user={user} country={country} rec={user.kid[country]} />
      </Page>
    </View>
  );
}
