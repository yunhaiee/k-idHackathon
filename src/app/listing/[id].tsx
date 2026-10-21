import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Price } from '@/components/Price';
import { TopBar } from '@/components/TopBar';
import { Btn, Eyebrow, H, Page, Txt } from '@/components/ui';
import { useDB } from '@/lib/api';
import { useDevice } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { C } from '@/lib/theme';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDB();
  const { persona } = useDevice();
  if (!db) return null;
  const listing = db.listings.find((l) => l.id === id);
  if (!listing) return null;
  const card = db.cards.find((c) => c.id === listing.cardId)!;
  const policy = getPolicy(db.users[persona]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar />
      <Page>
        <Btn label="Back" kind="quiet" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <Image source={card.image} style={{ width: '100%', height: 340 }} contentFit="contain" />
        <Eyebrow>{card.set} · {card.number}</Eyebrow>
        <H>{card.name}</H>
        <Price usd={card.priceUsd} policy={policy} />
        <Txt color={C.muted}>Listed by {db.users[listing.sellerId].name}</Txt>
      </Page>
    </View>
  );
}
