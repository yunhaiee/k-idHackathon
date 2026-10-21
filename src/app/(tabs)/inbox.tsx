import { router, useLocalSearchParams } from 'expo-router';

import { OfferThread } from '@/components/trade/OfferThread';
import { SentBanner } from '@/components/trade/SentBanner';
import { Eyebrow, H, Page, Txt } from '@/components/ui';
import { useDB } from '@/lib/api';
import { blockedOf } from '@/lib/demo';
import { useDevice } from '@/lib/device';
import { C } from '@/lib/theme';

export default function Inbox() {
  const db = useDB();
  const { persona } = useDevice();
  // ?sent=<offer ids> comes from "Send offer": confirm what just went out.
  const { sent } = useLocalSearchParams<{ sent?: string }>();
  if (!db) return null;
  const blocked = blockedOf(db.users[persona]);
  // Offers from a sender this child's parent blocked never show.
  const offers = db.offers.filter((o) => o.fromId === persona || (o.toId === persona && !blocked.includes(o.fromId)));
  return (
    <Page>
      <Eyebrow>Inbox</Eyebrow>
      <H>Offers and messages</H>
      {sent ? <SentBanner db={db} offerIds={sent.split(',')} onDismiss={() => router.setParams({ sent: undefined })} /> : null}
      {offers.length === 0 ? <Txt color={C.muted}>No offers yet. Open a listing to make one.</Txt> : null}
      {offers.map((o) => (
        <OfferThread key={o.id} db={db} offer={o} me={persona} />
      ))}
    </Page>
  );
}
