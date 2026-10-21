import { Image } from 'expo-image';
import { View } from 'react-native';

import { Btn, Eyebrow, Note, Rule, Txt } from '@/components/ui';
import { act } from '@/lib/api';
import { getPolicy } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { DB, Offer, PersonaId } from '@/lib/types';

import { Composer } from './Composer';
import { FairMeter } from './FairMeter';
import { MessageView } from './MessageView';

const value = (db: DB, ids: string[]) => ids.reduce((s, id) => s + (db.cards.find((c) => c.id === id)?.priceUsd ?? 0), 0);

export function OfferThread({ db, offer, me }: { db: DB; offer: Offer; me: PersonaId }) {
  // Parents approve trades but never read the kids' conversation.
  const policy = getPolicy(db.users[me]);
  const listing = db.listings.find((l) => l.id === offer.listingId);
  const wantCard = listing ? db.cards.find((c) => c.id === listing.cardId) : undefined;
  const offered = offer.offeredCardIds.map((id) => db.cards.find((c) => c.id === id)!).filter(Boolean);
  const want = wantCard?.priceUsd ?? 0;
  const give = value(db, offer.offeredCardIds);
  const role = offer.fromId === me ? 'sender' : offer.toId === me ? 'receiver' : 'parent';
  const other = db.users[role === 'sender' ? offer.toId : offer.fromId];
  const messages = db.messages.filter((m) => m.offerId === offer.id && (m.fromId === me || offer.fromId === me || offer.toId === me));

  return (
    <View style={{ gap: 12, paddingVertical: 8 }}>
      <Eyebrow>
        {role === 'sender' ? `Your offer to ${other.name}` : `${other.name}'s offer`} ·{' '}
        {offer.status === 'needs-parent' ? 'waiting for a parent' : offer.status}
      </Eyebrow>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {offered.map((c) => (
          <Image key={c.id} source={c.image} style={{ width: 44, height: 62 }} contentFit="contain" />
        ))}
        <Txt color={C.muted}>for</Txt>
        {wantCard ? <Image source={wantCard.image} style={{ width: 44, height: 62 }} contentFit="contain" /> : null}
        <Txt weight="semi" style={{ flex: 1 }}>
          {offered.map((c) => c.name).join(' + ')} → {wantCard?.name ?? 'card'}
        </Txt>
      </View>
      <FairMeter give={give} want={want} role={role} policy={policy} />

      {messages.map((m) => (
        <MessageView key={m.id} msg={m} viewer={me} policy={policy} from={db.users[m.fromId]} />
      ))}

      {offer.status === 'pending' && role !== 'parent' ? <Composer offerId={offer.id} me={me} policy={policy} /> : null}

      {offer.status === 'pending' && role === 'receiver' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn
            label={policy.tradeNeedsParent ? 'Accept · ask a parent' : 'Accept trade'}
            onPress={() => act({ action: 'respondOffer', offerId: offer.id, by: me, accept: true })}
            style={{ flex: 1 }}
            big={policy.bigUI}
          />
          <Btn
            label="Decline"
            kind="quiet"
            onPress={() => act({ action: 'respondOffer', offerId: offer.id, by: me, accept: false })}
            style={{ flex: 1 }}
            big={policy.bigUI}
          />
        </View>
      ) : null}
      {offer.status === 'needs-parent' ? (
        <Note title="Waiting for a parent">A grown-up checks this trade before any cards move.</Note>
      ) : null}
      {offer.status === 'accepted' ? <Note tone="ok" title="Trade done. Cards moved to each binder." /> : null}
      <Rule />
    </View>
  );
}
