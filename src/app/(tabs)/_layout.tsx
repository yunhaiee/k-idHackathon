import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KidGate } from '@/components/kid/KidGate';
import { Badge, Toast, useNotifications } from '@/components/Notifier';
import { TopBar } from '@/components/TopBar';
import { Page, Txt } from '@/components/ui';
import { useDB } from '@/lib/api';
import { useDevice } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { C } from '@/lib/theme';

function TabButton({ children, isFocused, onPress, badge = 0 }: TabTriggerSlotProps & { children: string; badge?: number }) {
  return (
    <Pressable onPress={onPress} style={styles.tab}>
      <View>
        <Txt size={13} weight={isFocused ? 'semi' : 'med'} color={isFocused ? C.text : C.muted}>
          {children}
        </Txt>
        <Badge count={badge} />
      </View>
      <View style={[styles.dot, isFocused && { backgroundColor: C.accent }]} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const db = useDB();
  const { persona } = useDevice();
  const user = db?.users[persona];
  const policy = user ? getPolicy(user) : null;
  const gated = !!user && policy?.status !== 'pass';
  const isParent = !!db && Object.values(db.users).some((u) => u.parentId === persona);
  const notes = useNotifications(db, persona);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar />
      {notes.toast && !gated ? (
        <View style={{ position: 'relative', zIndex: 50 }}>
          <Toast event={notes.toast} onDismiss={notes.dismiss} />
        </View>
      ) : null}
      {gated && user ? (
        // Same app for everyone: nobody gets in until k-ID has checked them for this country.
        Platform.OS === 'web' ? (
          <Page>
            <KidGate key={`${user.id}-${user.country}`} user={user} country={user.country} rec={user.kid[user.country]} />
          </Page>
        ) : (
          <View style={{ flex: 1 }}>
            <KidGate key={`${user.id}-${user.country}`} user={user} country={user.country} rec={user.kid[user.country]} />
          </View>
        )
      ) : (
        <Tabs>
          <TabSlot style={{ flex: 1 }} />
          <TabList style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
            <TabTrigger name="index" href="/" asChild>
              <TabButton>Market</TabButton>
            </TabTrigger>
            <TabTrigger name="scan" href="/scan" asChild>
              <TabButton>Scan</TabButton>
            </TabTrigger>
            <TabTrigger name="inbox" href="/inbox" asChild>
              <TabButton badge={notes.unread('inbox')}>Inbox</TabButton>
            </TabTrigger>
            <TabTrigger name="shop" href="/shop" asChild>
              <TabButton badge={notes.unread('shop')}>Shop</TabButton>
            </TabTrigger>
            <TabTrigger name="parent" href="/parent" asChild>
              <TabButton badge={notes.unread('parent')}>{isParent ? 'Family' : 'Me'}</TabButton>
            </TabTrigger>
          </TabList>
        </Tabs>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: C.bg,
    paddingTop: 10,
  },
  tab: { alignItems: 'center', gap: 5, paddingHorizontal: 10 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
});
