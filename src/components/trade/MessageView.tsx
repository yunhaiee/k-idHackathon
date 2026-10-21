import { useAudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Btn, Eyebrow, Note, Txt } from '@/components/ui';
import { WhyChip } from '@/components/WhyChip';
import { apiUrl } from '@/lib/api';
import { COPY } from '@/lib/copy';
import type { Policy } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { Message, PersonaId, User } from '@/lib/types';

/** "Kardza Intelligence · checked by Modulate + AI", or "(voice check simulated)" when Modulate didn't answer. */
export function checkedLabel(msg: Message) {
  const by = msg.checkedBy ?? [];
  if (!by.length) return '';
  const sim = by.includes('simulated') ? ` ${COPY.voice.simulated}` : '';
  const who = by.filter((b) => b !== 'simulated' && b !== 'rules');
  return `${COPY.intel.name} · ${COPY.intel.checkedBy(who.length ? who : ['rules'])}${sim}`;
}

/** Chat text has no server-side redaction: hide phone numbers and emails before a teen sees it. */
const hideContact = (t: string) =>
  t.replace(/(\+?\d[\d\s().-]{6,}\d)/g, '[phone hidden]').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email hidden]');

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

/** The message itself (play, transcript, checks) folded under one line, so a flagged thread stays readable. */
function Fold({ label, align, children }: { label: string; align?: 'flex-end'; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6, alignItems: align }}>
      <Pressable onPress={() => setOpen((o) => !o)} hitSlop={8}>
        <Txt size={13} weight="semi" color={C.muted}>
          {open ? `${COPY.thread.hide} ▴` : `${label} ▾`}
        </Txt>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/** Same message, different view per viewer: decided by getPolicy (k-ID), never by age here. */
export function MessageView({
  msg,
  viewer,
  viewerName,
  released,
  delivery,
  policy,
  from,
}: {
  msg: Message;
  viewer: PersonaId;
  viewerName: string;
  /** The receiver's parent let this through ("Let … see it"): show it with the scam warning. */
  released?: boolean;
  /** Sender's view: where the offer stands for the receiver ("Delivered to Maya", "Held for Anna's review"). */
  delivery?: string;
  policy: Policy;
  from: User;
}) {
  const mine = msg.fromId === viewer;
  const risky = msg.risk?.level === 'high';
  const body = msg.kind === 'voice' ? msg.transcript : msg.text;
  const checked = checkedLabel(msg);
  const label = `${mine ? 'You' : from.name} · ${msg.kind === 'voice' ? 'voice note' : 'message'}`;

  // Own message: right-aligned with a right rule (the mirror of Note), with what happened to it underneath.
  if (mine)
    return (
      <View style={{ gap: 6, alignSelf: 'flex-end', maxWidth: '88%' }}>
        <View style={{ borderRightWidth: 2, borderRightColor: risky ? C.danger : C.line, paddingRight: 12, paddingVertical: 4, gap: 6, alignItems: 'flex-end' }}>
          <Eyebrow>{label}</Eyebrow>
          <Txt size={12} color={risky ? C.danger : C.success}>
            {[risky ? COPY.thread.flagged : COPY.sent.you, delivery].filter(Boolean).join(' · ')}
          </Txt>
          <Fold label={COPY.thread.show(msg.kind)} align="flex-end">
            {msg.audioUrl ? <Play url={msg.audioUrl} /> : null}
            <Txt size={14} color={C.muted} style={{ textAlign: 'right' }}>
              {body}
            </Txt>
          </Fold>
        </View>
      </View>
    );

  // Kid: risky messages never reach them.
  if (policy.voice === 'hide-on-risk' && risky && !released)
    return (
      <View style={{ gap: 8 }}>
        <Note tone="danger" title={COPY.voice.hidden} />
        <WhyChip name={viewerName} policy={policy} />
      </View>
    );

  const showFull = policy.voice === 'transcript+warning' || policy.band === 'adult';
  const text = msg.kind === 'voice' ? (showFull ? msg.transcript : msg.redacted) : body;

  // Teen: a risky voice note or chat message is delivered with personal details hidden, under a scam banner.
  // A voice note plays once the teen has voice notes on in k-ID (player-managed); until then they read the
  // redacted transcript.
  const isVoice = msg.kind === 'voice';
  const canPlay = policy.voice === 'redact' || !!released;
  if ((policy.voice === 'redact' || policy.voice === 'none' || released) && risky)
    return (
      <View style={{ gap: 6 }}>
        <Eyebrow>{label}</Eyebrow>
        <Note tone="danger" title={COPY.voice.scamBanner} />
        <Fold label={COPY.thread.show(msg.kind)}>
          {msg.audioUrl && canPlay ? <Play url={msg.audioUrl} /> : null}
          {text ? <Txt color={C.muted}>{isVoice ? text : hideContact(text)}</Txt> : null}
          {isVoice && !canPlay ? (
            <View style={{ gap: 6 }}>
              <Txt size={12} color={C.muted}>
                {COPY.voice.offHint}
              </Txt>
              <Btn label={COPY.voice.turnOn} kind="quiet" onPress={() => router.push('/settings')} />
            </View>
          ) : null}
          {checked ? (
            <Txt size={11} color={C.muted}>
              {checked}
            </Txt>
          ) : null}
        </Fold>
      </View>
    );

  if (!risky)
    return (
      <View style={{ gap: 6 }}>
        <Eyebrow>{label}</Eyebrow>
        {msg.audioUrl ? <Play url={msg.audioUrl} /> : null}
        <Txt>{text}</Txt>
        {checked ? (
          <Txt size={11} color={C.muted}>
            {checked}
          </Txt>
        ) : null}
      </View>
    );

  // Adult: the verdict up front, the message and Modulate's evidence one tap away.
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      {showFull ? (
        <Note tone="danger" title="Scam warning">
          {msg.risk!.reasons.join(' · ')}
        </Note>
      ) : (
        <Note tone="warn" title="Careful">
          {`We hid personal details. ${msg.risk!.reasons.join(' · ')}`}
        </Note>
      )}
      <Fold label={COPY.thread.show(msg.kind)}>
        {msg.audioUrl && showFull ? <Play url={msg.audioUrl} /> : null}
        <Txt>{text}</Txt>
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
      </Fold>
    </View>
  );
}
