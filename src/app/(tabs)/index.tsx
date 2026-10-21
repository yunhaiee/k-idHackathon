import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Price } from '@/components/Price';
import { Eyebrow, H, Note, Page, Rule, Txt } from '@/components/ui';
import { useDB } from '@/lib/api';
import { useDevice } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { C } from '@/lib/theme';

export default function Market() {
  const db = useDB();
  const { persona } = useDevice();
  if (!db) return null;
  const me = db.users[persona];
  const policy = getPolicy(me);
  const mine = db.cards.filter((c) => c.ownerId === persona);

  return (
    <Page>
      <Eyebrow>Market</Eyebrow>
      <H>{policy.bigUI ? `Cards to trade, ${me.name}` : 'Listed now'}</H>
      {!policy.canTrade ? (
        <Note tone="warn" title="Trading is off for you here">
          k-ID's rules for your age and country don't allow trading. You can still look.
        </Note>
      ) : policy.tradeNeedsParent ? (
        <Note title="A grown-up checks every trade">Your parent sees each trade before it happens.</Note>
      ) : null}

      {db.listings.map((l) => {
        const card = db.cards.find((c) => c.id === l.cardId)!;
        const seller = db.users[l.sellerId];
        return (
          <Link key={l.id} href={`/listing/${l.id}`} asChild>
            <Pressable style={styles.row}>
              <Image source={card.image} style={[styles.thumb, policy.bigUI && styles.thumbBig]} contentFit="contain" />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt weight="semi" size={policy.bigUI ? 18 : 16}>
                  {card.name}
                </Txt>
                <Txt size={13} color={C.muted}>
                  {card.set} · {card.number} · {seller.id === persona ? 'you' : seller.name}
                </Txt>
                <Price usd={card.priceUsd} policy={policy} compact />
              </View>
            </Pressable>
          </Link>
        );
      })}

      <Rule />
      <Eyebrow>Your binder</Eyebrow>
      {mine.length === 0 ? <Txt color={C.muted}>No cards yet. Scan one to start.</Txt> : null}
      {mine.map((card) => (
        <View key={card.id} style={styles.row}>
          <Image source={card.image} style={styles.thumb} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Txt weight="semi">{card.name}</Txt>
            <Price usd={card.priceUsd} policy={policy} compact />
          </View>
        </View>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 6 },
  thumb: { width: 56, height: 78, borderRadius: 4 },
  thumbBig: { width: 72, height: 100 },
});
