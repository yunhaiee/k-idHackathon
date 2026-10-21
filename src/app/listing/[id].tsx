import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Price } from '@/components/Price';
import { TopBar } from '@/components/TopBar';
import { FairMeter } from '@/components/trade/FairMeter';
import { Btn, Eyebrow, H, Note, Page, Rule, Txt } from '@/components/ui';
import { act, useDB } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { useDevice } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { AI_PRICED_CARD_IDS } from '@/lib/seed';
import { C } from '@/lib/theme';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDB();
  const { persona } = useDevice();
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  if (!db) return null;
  const listing = db.listings.find((l) => l.id === id);
  if (!listing)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar />
        <Page>
          <Btn label="Back" kind="quiet" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
          <Txt color={C.muted}>This card was traded.</Txt>
        </Page>
      </View>
    );
  const card = db.cards.find((c) => c.id === listing.cardId)!;
  const me = db.users[persona];
  const policy = getPolicy(me);
  const mine = listing.sellerId === persona;
  const binder = db.cards.filter((c) => c.ownerId === persona && !db.listings.some((l) => l.cardId === c.id));
  const give = binder.filter((c) => picked.includes(c.id)).reduce((s, c) => s + c.priceUsd, 0);
  const trade = policy.access['virtual-property-ownership'];

  const send = async () => {
    setError(null);
    const res = await act({ action: 'createOffer', listingId: listing.id, fromId: persona, offeredCardIds: picked });
    if ((res as unknown as { error?: string }).error) setError((res as unknown as { error: string }).error);
    else router.push('/inbox');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar />
      <Page>
        <Btn label="Back" kind="quiet" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <Image source={card.image} style={{ width: '100%', height: 320 }} contentFit="contain" />
        <Eyebrow>
          {card.set} · {card.number}
        </Eyebrow>
        <H>{card.name}</H>
        <Price usd={card.priceUsd} policy={policy} />
        {AI_PRICED_CARD_IDS.includes(card.id) ? <Eyebrow color={C.accent}>{COPY.market.aiPriced}</Eyebrow> : null}
        <Txt color={C.muted}>Listed by {mine ? 'you' : db.users[listing.sellerId].name}</Txt>
        <Rule />

        {mine ? (
          <Txt color={C.muted}>Offers for this card show up in your Inbox.</Txt>
        ) : trade === 'parent' ? (
          <View style={{ gap: 8 }}>
            <Note tone="warn" title="Trading needs a grown-up's OK">
              k-ID asks your parent before you can trade here. Ask from k-ID settings.
            </Note>
            <Btn label="Ask in k-ID settings" kind="quiet" onPress={() => router.push('/settings')} />
          </View>
        ) : trade !== 'on' ? (
          <Note title="Trading isn't available for you here">k-ID's rules for your age and country.</Note>
        ) : (
          <View style={{ gap: 10 }}>
            <Eyebrow>Make an offer · pick cards from your binder</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {binder.map((c) => {
                const on = picked.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                    style={{
                      alignItems: 'center',
                      gap: 4,
                      padding: 6,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: on ? C.accent : C.line,
                    }}>
                    <Image source={c.image} style={{ width: 64, height: 88 }} contentFit="contain" />
                    <Txt size={12} color={on ? C.text : C.muted}>
                      {c.name}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            {picked.length ? <FairMeter give={give} want={card.priceUsd} role="sender" policy={policy} /> : null}
            <Btn label="Send offer" disabled={!picked.length} onPress={send} big={policy.bigUI} />
            {error ? <Note tone="danger" title={error} /> : null}
          </View>
        )}
      </Page>
    </View>
  );
}
