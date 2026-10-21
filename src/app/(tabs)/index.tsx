import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Price } from '@/components/Price';
import { Chip, Eyebrow, H, Note, Page, Txt } from '@/components/ui';
import { GradientText, HOLO } from '@/components/Wordmark';
import { useDB } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { tradeNeedsParentApproval, tradingApprovedByParent } from '@/lib/demo';
import { useDevice } from '@/lib/device';
import { getPolicy, type Policy } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { Card } from '@/lib/types';

const BORDER = 'rgba(255,255,255,0.08)';

/** Where a card's price came from, as a small tag: real market data, or Kardza's AI estimate. */
const priceTag = (card: Card) => (card.priceSource?.includes('TCGplayer') ? COPY.market.marketPriced : COPY.market.aiPriced);

/** Collection value, worded the way this player reads prices (kids get a round "About"). */
function collectionValue(total: number, policy: Policy) {
  if (policy.priceView === 'plain') return `About $${Math.max(5, Math.round(total / 5) * 5)}`;
  return `$${Math.round(total).toLocaleString('en-US')}`;
}

export default function Market() {
  const db = useDB();
  const { persona } = useDevice();
  if (!db) return null;
  const me = db.users[persona];
  const policy = getPolicy(me);
  const mine = db.cards.filter((c) => c.ownerId === persona);
  const total = mine.reduce((s, c) => s + c.priceUsd, 0);

  return (
    <Page>
      {/* Display case header: what your binder is worth, in holo foil. */}
      <View style={styles.collection}>
        <Eyebrow>{COPY.market.collection}</Eyebrow>
        <GradientText size={policy.bigUI ? 40 : 38} colors={HOLO}>
          {collectionValue(total, policy)}
        </GradientText>
        <Txt size={13} color={C.muted}>
          {COPY.market.cardCount(mine.length)}
        </Txt>
      </View>

      {!policy.canTrade ? (
        <Note tone="warn" title="Trading is off for you here">
          k-ID's rules for your age and country don't allow trading. You can still look.
        </Note>
      ) : tradeNeedsParentApproval(policy) ? (
        <Note title={COPY.market.parentChecks}>{COPY.market.parentChecksBody}</Note>
      ) : tradingApprovedByParent(me) ? (
        // A guardian already turned trading on in k-ID: a quiet confirmation, no banner.
        <View style={{ alignSelf: 'flex-start' }}>
          <Chip label={COPY.market.approvedByParent} active color={C.success} />
        </View>
      ) : null}

      <View style={{ gap: 4, marginTop: 4 }}>
        <Eyebrow>Market</Eyebrow>
        <H size={24}>{policy.bigUI ? `Cards to trade, ${me.name}` : 'Listed now'}</H>
      </View>

      <View style={styles.grid}>
        {db.listings.map((l) => {
          const card = db.cards.find((c) => c.id === l.cardId)!;
          const seller = db.users[l.sellerId];
          const myOffer = db.offers.find((o) => o.listingId === l.id && o.fromId === persona && o.status !== 'declined');
          return (
            <Link key={l.id} href={`/listing/${l.id}`} asChild>
              {/* Link asChild drops function styles, so the size is a plain style and the tile look is inside. */}
              <Pressable style={styles.cell}>
                <View style={[styles.tile, styles.fill]}>
                  <View>
                    <Image source={card.image} style={styles.art} contentFit="cover" />
                    {/* You already made an offer on this card. */}
                    {myOffer ? (
                      <View style={styles.badge}>
                        <Txt size={11} weight="semi" color={myOffer.status === 'countered' ? C.warning : '#fff'}>
                          {TAG[myOffer.status] ?? COPY.market.requested}
                        </Txt>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ gap: 3, paddingHorizontal: 2 }}>
                    <Txt weight="semi" size={policy.bigUI ? 17 : 15} numberOfLines={1}>
                      {card.name}
                    </Txt>
                    <Txt size={12} color={C.muted} numberOfLines={1}>
                      {seller.id === persona ? 'Your listing' : seller.name} · {card.set}
                    </Txt>
                    <Price usd={card.priceUsd} policy={policy} compact />
                    <Txt size={10} weight="semi" color={C.accent} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>
                      {priceTag(card)}
                    </Txt>
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>

      <View style={{ gap: 4, marginTop: 8 }}>
        <Eyebrow>{COPY.market.binder}</Eyebrow>
      </View>
      {mine.length === 0 ? <Txt color={C.muted}>No cards yet. Scan one to start.</Txt> : null}
      <View style={[styles.grid, styles.binder]}>
        {mine.map((card) => (
          <View key={card.id} style={[styles.tile, styles.small]}>
            <Image source={card.image} style={styles.art} contentFit="cover" />
            <View style={{ gap: 2, paddingHorizontal: 2 }}>
              <Txt weight="semi" size={13} numberOfLines={1}>
                {card.name}
              </Txt>
              <Price usd={card.priceUsd} policy={policy} compact />
            </View>
          </View>
        ))}
      </View>
    </Page>
  );
}

const TAG: Partial<Record<string, string>> = {
  countered: COPY.market.countered,
};

const styles = StyleSheet.create({
  collection: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  tile: {
    width: '48%',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    gap: 10,
  },
  small: { width: '31%', padding: 8, gap: 6 },
  cell: { width: '48%' },
  binder: { justifyContent: 'flex-start', columnGap: 10 },
  fill: { width: '100%' },
  art: {
    width: '100%',
    aspectRatio: 63 / 88,
    borderRadius: 10,
    backgroundColor: C.surface2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(10,10,15,0.82)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
});
