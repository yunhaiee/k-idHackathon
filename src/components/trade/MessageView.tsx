import { useAudioPlayer } from 'expo-audio';
import { Pressable, View } from 'react-native';

import { Eyebrow, Note, Txt } from '@/components/ui';
import { WhyChip } from '@/components/WhyChip';
import { apiUrl } from '@/lib/api';
import { COPY } from '@/lib/copy';
import type { Policy } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { Message, PersonaId, User } from '@/lib/types';

/** Credibility lost for a blocked message. The server applies it (NOTES_FOR_YUNHA.md); the UI only says so. */
const CREDIBILITY_HIT = 5;

/** "Kardza Intelligence · checked by Modulate + AI", or "(voice check simulated)" when Modulate didn't answer. */
export function checkedLabel(msg: Message) {
  const by = msg.checkedBy ?? [];
  if (!by.length) return '';
  const sim = by.includes('simulated') ? ` ${COPY.voice.simulated}` : '';
  const who = by.filter((b) => b !== 'simulated' && b !== 'rules');
  return `${COPY.intel.name} · ${COPY.intel.checkedBy(who.length ? who : ['rules'])}${sim}`;
}

function Play({ url }: { url: string }) {
  const player = useAudioPlayer(apiUrl(url));
  return (
    <Pressable
      onPress={() => {
        player.seekTo(0);
        player.play();
      }}
      style={{ paddingVertical: 6 }}>
      <Txt weight="semi" color={C.accent}>
        {COPY.voice.play}
      </Txt>
    </Pressable>
  );
}

/** Same message, different view per viewer: decided by getPolicy (k-ID), never by age here. */
export function MessageView({
  msg,
  viewer,
  viewerName,
  policy,
  from,
}: {
  msg: Message;
  viewer: PersonaId;
  viewerName: string;
  policy: Policy;
  from: User;
}) {
  const mine = msg.fromId === viewer;
  const risky = msg.risk?.level === 'high';
  const body = msg.kind === 'voice' ? msg.transcript : msg.text;
  const checked = checkedLabel(msg);
  const label = `${mine ? 'You' : from.name} · ${msg.kind === 'voice' ? 'voice note' : 'message'}`;

  if (mine)
    return (
      <View style={{ gap: 4, alignSelf: 'flex-end', maxWidth: '90%' }}>
        <Eyebrow>{label}</Eyebrow>
        <Txt>{body}</Txt>
        {risky ? <Note tone="danger" title={COPY.sender.flagged(CREDIBILITY_HIT)} /> : null}
      </View>
    );

  // Kid: risky messages never reach them.
  if (policy.voice === 'hide-on-risk' && risky)
    return (
      <View style={{ gap: 8 }}>
        <Note tone="danger" title={COPY.voice.hidden} />
        <WhyChip name={viewerName} policy={policy} />
      </View>
    );

  const showFull = policy.voice === 'transcript+warning' || policy.band === 'adult';
  const text = msg.kind === 'voice' ? (showFull ? msg.transcript : msg.redacted) : body;

  // Teen: the risky voice note is delivered with personal details hidden, under a scam banner. It plays
  // once the teen has voice notes on in k-ID (player-managed); until then they read the redacted transcript.
  if ((policy.voice === 'redact' || policy.voice === 'none') && risky && msg.kind === 'voice')
    return (
      <View style={{ gap: 6 }}>
        <Eyebrow>{label}</Eyebrow>
        <Note tone="danger" title={COPY.voice.scamBanner} />
        {msg.audioUrl && policy.voice === 'redact' ? <Play url={msg.audioUrl} /> : null}
        {text ? <Txt color={C.muted}>{text}</Txt> : null}
        {policy.voice === 'none' ? (
          <Txt size={12} color={C.muted}>
            {COPY.voice.offHint}
          </Txt>
        ) : null}
        {checked ? (
          <Txt size={11} color={C.muted}>
            {checked}
          </Txt>
        ) : null}
      </View>
    );

  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      {msg.audioUrl && !risky ? <Play url={msg.audioUrl} /> : null}
      {msg.audioUrl && risky && showFull ? <Play url={msg.audioUrl} /> : null}
      <Txt>{text}</Txt>
      {risky && showFull ? (
        <Note tone="danger" title="Scam warning">
          {`Asking to move off Kardza is a common scam. ${msg.risk!.reasons.join(' · ')}`}
        </Note>
      ) : risky ? (
        <Note tone="warn" title="Careful">
          {`We hid personal details. ${msg.risk!.reasons.join(' · ')}`}
        </Note>
      ) : null}
      {showFull && msg.behaviors?.length ? (
        <Txt size={12} color={C.muted}>
          {`Modulate Velma: ${msg.behaviors.map((b) => `${b.name} ${Math.round(b.confidence * 100)}%`).join(', ')}`}
        </Txt>
      ) : null}
      {showFull && msg.deepfake != null ? (
        <Txt size={12} color={msg.deepfake > 0.85 ? C.warning : C.muted}>
          {`Synthetic-voice score ${Math.round(msg.deepfake * 100)}%${msg.emotions?.length ? ` · tone: ${msg.emotions.join(', ')}` : ''}`}
        </Txt>
      ) : null}
      {checked ? (
        <Txt size={11} color={C.muted}>
          {checked}
        </Txt>
      ) : null}
    </View>
  );
}
