import { OfferThread } from '@/components/trade/OfferThread';
import { Eyebrow, H, Page, Txt } from '@/components/ui';
import { useDB } from '@/lib/api';
import { useDevice } from '@/lib/device';
import { C } from '@/lib/theme';

export default function Inbox() {
  const db = useDB();
  const { persona } = useDevice();
  if (!db) return null;
  const offers = db.offers.filter((o) => o.fromId === persona || o.toId === persona);
  return (
    <Page>
      <Eyebrow>Inbox</Eyebrow>
      <H>Offers and messages</H>
      {offers.length === 0 ? <Txt color={C.muted}>No offers yet. Open a listing to make one.</Txt> : null}
      {offers.map((o) => (
        <OfferThread key={o.id} db={db} offer={o} me={persona} />
      ))}
    </Page>
  );
}
