import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Price } from '@/components/Price';
import { Eyebrow, H, Note, Page, Rule, Txt } from '@/components/ui';
import { useDB } from '@/lib/api';
import { tradeNeedsGuardianOptIn, tradeNeedsParentApproval } from '@/lib/demo';
import { COPY } from '@/lib/copy';
import { useDevice } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { AI_PRICE_SOURCE } from '@/lib/seed';
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
      ) : tradeNeedsParentApproval(policy) ? (
        <Note title={COPY.market.parentChecks}>{COPY.market.parentChecksBody}</Note>
      ) : tradeNeedsGuardianOptIn(policy) ? (
        <Note title={COPY.market.guardianOptIn}>{COPY.market.guardianOptInBody}</Note>
      ) : null}

      {db.listings.map((l) => {
        const card = db.cards.find((c) => c.id === l.cardId)!;
        const seller = db.users[l.sellerId];
        const myOffer = db.offers.find((o) => o.listingId === l.id && o.fromId === persona && o.status !== 'declined');
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
                <Price usd={card.priceUsd} compact />
                {card.priceSource === AI_PRICE_SOURCE ? (
                  <Eyebrow color={C.accent}>{COPY.market.aiPriced}</Eyebrow>
                ) : null}
              </View>
              {/* You already made an offer on this card: say so on the right. */}
              {myOffer ? <Tag label={TAG[myOffer.status] ?? COPY.market.requested} color={myOffer.status === 'countered' ? C.warning : C.accent} /> : null}
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
            <Price usd={card.priceUsd} compact />
          </View>
        </View>
      ))}
    </Page>
  );
}

const TAG: Partial<Record<string, string>> = { countered: COPY.market.countered };

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Txt size={12} weight="semi" color={color}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 6 },
  thumb: { width: 56, height: 78, borderRadius: 4 },
  thumbBig: { width: 72, height: 100 },
});
