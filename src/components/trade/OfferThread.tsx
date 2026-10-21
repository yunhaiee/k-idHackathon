import { Image } from 'expo-image';
import { View } from 'react-native';

import { Btn, Eyebrow, Note, Rule, Txt } from '@/components/ui';
import { Credibility } from '@/components/Credibility';
import { WhyChip } from '@/components/WhyChip';
import { act } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { analysisOf, blockedOf, cashOf, credibilityOf, type DemoOffer, heldForParent, RISK_LABEL } from '@/lib/demo';
import { getPolicy } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { DB, Offer, PersonaId } from '@/lib/types';

import { Composer } from './Composer';
import { FairMeter } from './FairMeter';
import { checkedLabel, MessageView } from './MessageView';
import { OfferActions } from './OfferActions';

const STATUS_LABEL: Partial<Record<Offer['status'], string>> = {
  held: 'with a parent for review',
  'needs-parent': 'waiting for a parent',
  countered: 'countered',
};

const value = (db: DB, ids: string[]) => ids.reduce((s, id) => s + (db.cards.find((c) => c.id === id)?.priceUsd ?? 0), 0);

export function OfferThread({ db, offer, me }: { db: DB; offer: Offer; me: PersonaId }) {
  // Parents approve trades but never read the kids' conversation.
  const policy = getPolicy(db.users[me]);
  const listing = db.listings.find((l) => l.id === offer.listingId);
  const wantCard = listing ? db.cards.find((c) => c.id === listing.cardId) : undefined;
  const offered = offer.offeredCardIds.map((id) => db.cards.find((c) => c.id === id)!).filter(Boolean);
  const cash = cashOf(offer);
  const want = wantCard?.priceUsd ?? 0;
  const give = value(db, offer.offeredCardIds) + cash;
  const role = offer.fromId === me ? 'sender' : offer.toId === me ? 'receiver' : 'parent';
  const other = db.users[role === 'sender' ? offer.toId : offer.fromId];
  const sender = db.users[offer.fromId];
  const messages = db.messages.filter((m) => m.offerId === offer.id && (m.fromId === me || offer.fromId === me || offer.toId === me));
  const credibility = credibilityOf(sender);
  const analysis = analysisOf(offer);
  const voiceMsg = messages.find((m) => m.kind === 'voice');
  const intel = voiceMsg
    ? checkedLabel(voiceMsg).replace(`${COPY.intel.name} · `, '')
    : COPY.intel.checkedBy(analysis?.checkedBy?.length ? analysis.checkedBy : ['AI']);
  const what = [...offered.map((c) => c.name), ...(cash ? [`$${cash}`] : [])].join(' + ') || 'An offer';

  // k-ID puts a parent in charge of this receiver's trades and messages: nothing reaches them directly.
  // Held until the parent taps "Let … see it" (offer.parentApproved, set by the server).
  const released = !!(offer as DemoOffer).parentApproved;
  // A sender this child's parent blocked can't reach them: nothing from them shows.
  if (role === 'receiver' && blockedOf(db.users[me]).includes(offer.fromId)) return null;
  if (role === 'receiver' && heldForParent(policy) && !released && (offer.status === 'held' || offer.status === 'pending')) {
    const blocked = messages.some((m) => m.risk?.level === 'high');
    return (
      <View style={{ gap: 12, paddingVertical: 8 }}>
        <Note tone={blocked ? 'danger' : 'info'} title={blocked ? COPY.voice.hidden : COPY.voice.held} />
        <WhyChip name={db.users[me].name} policy={policy} />
        <Rule />
      </View>
    );
  }

  return (
    <View style={{ gap: 12, paddingVertical: 8 }}>
      <Eyebrow>
        {role === 'sender' ? `Your offer to ${other.name}` : `${other.name}'s offer`} ·{' '}
        {STATUS_LABEL[offer.status] ?? offer.status}
      </Eyebrow>
      {credibility != null ? <Credibility score={credibility} prefix={role === 'sender' ? 'You' : sender.name} /> : null}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {offered.map((c) => (
          <Image key={c.id} source={c.image} style={{ width: 44, height: 62 }} contentFit="contain" />
        ))}
        {offered.length ? <Txt color={C.muted}>for</Txt> : null}
        {wantCard ? <Image source={wantCard.image} style={{ width: 44, height: 62 }} contentFit="contain" /> : null}
        <Txt weight="semi" style={{ flex: 1 }}>
          {what} → {wantCard?.name ?? 'card'}
        </Txt>
      </View>
      <View style={{ gap: 6 }}>
        <Eyebrow color={C.accent}>{COPY.intel.name}</Eyebrow>
        <FairMeter give={give} want={analysis?.fairness.marketValue ?? want} role={role} policy={policy} />
        {/* Adults see what was found and the evidence; kids and teens get the verdict and banners only. */}
        {policy.band === 'adult' && analysis?.risks.length
          ? analysis.risks.map((r) => (
              <Txt key={r.type + r.evidence} size={13} color={C.danger}>
                {`${RISK_LABEL[r.type] ?? r.type} · "${r.evidence}"`}
              </Txt>
            ))
          : null}
        <Txt size={11} color={C.muted}>
          {intel}
        </Txt>
      </View>

      {messages.map((m) => (
        <MessageView
          key={m.id}
          msg={m}
          viewer={me}
          viewerName={db.users[me].name}
          released={released}
          policy={policy}
          from={db.users[m.fromId]}
        />
      ))}

      {offer.status === 'pending' && role !== 'parent' ? <Composer offerId={offer.id} me={me} policy={policy} /> : null}

      <OfferActions
        offer={offer as DemoOffer}
        me={me}
        role={role}
        policy={policy}
        otherName={other.name}
        needsParent={policy.tradeNeedsParent && !!db.users[me].parentId}
      />
      {offer.status === 'needs-parent' ? (
        <Note title="Waiting for a parent">A grown-up checks this trade before any cards move.</Note>
      ) : null}
      {offer.status === 'accepted' ? <Note tone="ok" title={COPY.deal.agreed}>{COPY.deal.agreedBody}</Note> : null}
      <Rule />
    </View>
  );
}
