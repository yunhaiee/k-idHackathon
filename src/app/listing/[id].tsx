import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Credibility } from '@/components/Credibility';
import { Price } from '@/components/Price';
import { TopBar } from '@/components/TopBar';
import { FairMeter } from '@/components/trade/FairMeter';
import { sendVoiceNote, VoiceRecorder, type VoiceNote } from '@/components/trade/VoiceRecorder';
import { Btn, Eyebrow, H, Note, Page, Rule, Txt } from '@/components/ui';
import { act, refreshDB, useDB } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { credibilityOf } from '@/lib/demo';
import { useDevice } from '@/lib/device';
import { goBack } from '@/lib/nav';
import { getPolicy } from '@/lib/policy';
import { AI_PRICE_SOURCE } from '@/lib/seed';
import { C, F } from '@/lib/theme';
import type { DB } from '@/lib/types';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDB();
  const { persona } = useDevice();
  const [open, setOpen] = useState(false);
  const [cash, setCash] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [voice, setVoice] = useState<VoiceNote | null>(null);
  const [alsoSimilar, setAlsoSimilar] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  if (!db) return null;
  const listing = db.listings.find((l) => l.id === id);
  if (!listing)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar />
        <Page>
          <Btn label="Back" kind="quiet" onPress={() => goBack()} style={{ alignSelf: 'flex-start' }} />
          <Txt color={C.muted}>This card was traded.</Txt>
        </Page>
      </View>
    );
  const card = db.cards.find((c) => c.id === listing.cardId)!;
  const me = db.users[persona];
  const policy = getPolicy(me);
  const mine = listing.sellerId === persona;
  const binder = db.cards.filter((c) => c.ownerId === persona && !db.listings.some((l) => l.cardId === c.id));
  const cashUsd = Math.max(0, Math.round(Number(cash.replace(/[^0-9.]/g, '')) || 0));
  const give = binder.filter((c) => picked.includes(c.id)).reduce((s, c) => s + c.priceUsd, 0) + cashUsd;
  const trade = policy.access['virtual-property-ownership'];
  // Other listings of the same card from other sellers: one send can reach them all.
  const similar = db.listings.filter(
    (l) => l.id !== listing.id && l.sellerId !== persona && db.cards.find((c) => c.id === l.cardId)?.name === card.name,
  );

  const send = async () => {
    if (sending.current) return; // no double-send from a quick second tap
    setError(null);
    if (!give) {
      setError(COPY.offer.needAmount);
      return;
    }
    sending.current = true;
    const targets = [listing, ...(alsoSimilar ? similar : [])];
    // Each step names itself, so a failure says where it stopped instead of failing silently.
    let step: string = COPY.offer.stepSave;
    try {
      setBusy(COPY.offer.sending);
      const offerIds: string[] = [];
      for (const l of targets) {
        // cashUsd is ignored by the server until it stores cash on offers (NOTES_FOR_YUNHA.md).
        const res = (await act({ action: 'createOffer', listingId: l.id, fromId: persona, offeredCardIds: picked, cashUsd })) as DB & {
          error?: string;
        };
        if (res.error) throw new Error(res.error);
        const offer = res.offers?.find((o) => o.listingId === l.id && o.fromId === persona);
        if (!offer) throw new Error(COPY.offer.notSaved);
        offerIds.push(offer.id);
      }
      if (voice) {
        step = COPY.offer.stepVoice;
        setBusy(COPY.voice.checking);
        await Promise.all(offerIds.map((offerId) => sendVoiceNote(offerId, persona, voice)));
      }
      step = COPY.offer.stepDeliver;
      await refreshDB();
      // The inbox opens with a 'Sent' confirmation for exactly these offers.
      router.push({ pathname: '/inbox', params: { sent: offerIds.join(',') } });
    } catch (e) {
      setError(`${step}: ${String((e as Error).message ?? e)}`);
    } finally {
      sending.current = false;
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar />
      <Page>
        {/* Back closes the offer form first, then leaves the listing. */}
        <Btn label="Back" kind="quiet" onPress={() => (open ? setOpen(false) : goBack())} style={{ alignSelf: 'flex-start' }} />
        <Image source={card.image} style={{ width: '100%', height: 320 }} contentFit="contain" />
        <Eyebrow>
          {card.set} · {card.number}
        </Eyebrow>
        <H>{card.name}</H>
        <Price usd={card.priceUsd} policy={policy} />
        {card.priceSource === AI_PRICE_SOURCE ? <Eyebrow color={C.accent}>{COPY.market.aiPriced}</Eyebrow> : null}
        {/* Who you'd trade with, and how much the marketplace trusts them. */}
        {credibilityOf(db.users[listing.sellerId]) != null ? (
          <Credibility
            score={credibilityOf(db.users[listing.sellerId])!}
            prefix={`Listed by ${mine ? 'you' : db.users[listing.sellerId].name}`}
          />
        ) : (
          <Txt color={C.muted}>Listed by {mine ? 'you' : db.users[listing.sellerId].name}</Txt>
        )}
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
        ) : !open ? (
          <Btn label={COPY.offer.make} onPress={() => setOpen(true)} big={policy.bigUI} />
        ) : (
          <View style={{ gap: 12 }}>
            <Eyebrow>{COPY.offer.make}</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt weight="display" size={24}>
                $
              </Txt>
              <TextInput
                value={cash}
                onChangeText={setCash}
                placeholder="20"
                placeholderTextColor={C.muted}
                inputMode="decimal"
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  color: C.text,
                  fontFamily: F.display,
                  fontSize: 24,
                  borderBottomWidth: 1,
                  borderBottomColor: C.line,
                  paddingVertical: 6,
                }}
              />
            </View>

            {binder.length ? (
              <>
                <Txt size={13} color={C.muted}>
                  {COPY.offer.addCards}
                </Txt>
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
                        <Image source={c.image} style={{ width: 48, height: 66 }} contentFit="contain" />
                        <Txt size={12} color={on ? C.text : C.muted}>
                          {c.name}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {give ? <FairMeter give={give} want={card.priceUsd} role="sender" policy={policy} /> : null}

            {policy.access['voice-chat'] === 'on' ? <VoiceRecorder value={voice} onChange={setVoice} /> : null}

            {similar.length ? (
              <Pressable onPress={() => setAlsoSimilar((v) => !v)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    borderWidth: 1,
                    borderColor: alsoSimilar ? C.accent : C.line,
                    backgroundColor: alsoSimilar ? C.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {alsoSimilar ? (
                    <Txt size={13} weight="semi" color="#fff">
                      ✓
                    </Txt>
                  ) : null}
                </View>
                <Txt>{COPY.offer.alsoSimilar(similar.length, card.name)}</Txt>
              </Pressable>
            ) : null}

            <Btn label={busy ?? COPY.offer.send} disabled={!!busy} onPress={send} big={policy.bigUI} />
            {error ? <Note tone="danger" title={error} /> : null}
          </View>
        )}
      </Page>
    </View>
  );
}
