import { useAudioPlayer } from 'expo-audio';
import { Pressable, View } from 'react-native';

import { Eyebrow, Note, Txt } from '@/components/ui';
import { apiUrl } from '@/lib/api';
import type { Policy } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { Message, PersonaId, User } from '@/lib/types';

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
        ▶ Play voice note
      </Txt>
    </Pressable>
  );
}

/** Same message, different view per viewer: decided by getPolicy (k-ID), never by age here. */
export function MessageView({
  msg,
  viewer,
  policy,
  from,
}: {
  msg: Message;
  viewer: PersonaId;
  policy: Policy;
  from: User;
}) {
  const mine = msg.fromId === viewer;
  const risky = msg.risk?.level === 'high';
  const body = msg.kind === 'voice' ? msg.transcript : msg.text;
  const checked = msg.checkedBy?.length ? `Checked by ${msg.checkedBy.join(' · ')}` : '';
  const label = `${mine ? 'You' : from.name} · ${msg.kind === 'voice' ? 'voice note' : 'message'}`;

  if (mine)
    return (
      <View style={{ gap: 4, alignSelf: 'flex-end', maxWidth: '90%' }}>
        <Eyebrow>{label}</Eyebrow>
        <Txt>{body}</Txt>
        {risky ? (
          <Note tone="warn" title="Flagged for safety">
            Sharing contact info, keeping secrets, or meeting up isn't allowed on Kardza.
          </Note>
        ) : null}
      </View>
    );

  // Kid: risky messages never reach them.
  if (policy.voice === 'hide-on-risk' && risky)
    return (
      <View style={{ gap: 4 }}>
        <Eyebrow>{label}</Eyebrow>
        <Note tone="danger" title="Message hidden for your safety">
          We told your parent. You didn't do anything wrong.
        </Note>
      </View>
    );

  const showFull = policy.voice === 'transcript+warning' || policy.band === 'adult';
  const text = msg.kind === 'voice' ? (showFull ? msg.transcript : msg.redacted) : body;

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
