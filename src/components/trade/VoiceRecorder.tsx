// Hold-to-record voice note for offers (browser mic via MediaRecorder), with a live timer + waveform and a
// playback preview before sending.
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Note, Txt } from '@/components/ui';
import { apiUrl } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { C } from '@/lib/theme';
import type { PersonaId } from '@/lib/types';

export type VoiceNote = { kind: 'recording'; blob: Blob; url: string; seconds: number };

const MAX_SECONDS = 15;
const BARS = 40;

/** Upload a voice note for one offer; the server runs Modulate on it. Throws with the server's reason on failure. */
export async function sendVoiceNote(offerId: string, fromId: PersonaId, voice: VoiceNote) {
  const fd = new FormData();
  fd.append('offerId', offerId);
  fd.append('fromId', fromId);
  fd.append('file', voice.blob, voice.blob.type.includes('mp4') ? 'voice.mp4' : 'voice.webm');
  const res = await fetch(apiUrl('/api/voice'), { method: 'POST', body: fd });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let reason = body.replace(/<[^>]+>/g, ' ').trim().slice(0, 140);
    try {
      reason = (JSON.parse(body) as { error?: string }).error ?? reason;
    } catch {}
    throw new Error(reason || `${res.status} ${res.statusText}`);
  }
}

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return undefined;
  // mp4 first: it's the format Modulate is known to accept (Safari, recent Chrome). webm/opus is the fallback.
  return ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m));
}

const fmt = (s: number) => `0:${String(Math.floor(s)).padStart(2, '0')}`;

function Waveform({ levels, color }: { levels: number[]; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 32, flex: 1 }}>
      {levels.map((l, i) => (
        <View key={i} style={{ width: 3, borderRadius: 2, height: Math.max(3, l * 32), backgroundColor: color }} />
      ))}
    </View>
  );
}

export function VoiceRecorder({
  value,
  onChange,
  compact,
}: {
  value: VoiceNote | null;
  onChange: (v: VoiceNote | null) => void;
  /** A small pill for the corner of a message box, with its status in the pill instead of below it. */
  compact?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'asking' | 'ready' | 'recording' | 'short' | 'denied'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  /** When the current press began: a long press is hold-to-record, a quick tap (or a cancelled press) toggles. */
  const pressedAt = useRef(0);
  const stopAt = useRef<() => void>(() => {});
  const audio = useRef<HTMLAudioElement | null>(null);

  const canRecord = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!pickMime();

  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      audio.current?.pause();
    },
    [],
  );

  const start = async () => {
    if (!stream.current) {
      // First use: the browser asks for the mic. The prompt usually cancels the press, so recording then
      // continues in tap mode (tap again to stop).
      setState('asking');
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setState('denied');
        return;
      }
      pressedAt.current = 0;
    }
    const mime = pickMime();
    const rec = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    // Live waveform: loudness of the mic every ~80ms.
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream.current).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    const began = Date.now();
    setLevels([]);
    setSeconds(0);
    const tick = setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      const rms = Math.min(1, Math.sqrt(sum / buf.length) * 4);
      setLevels((l) => [...l.slice(-(BARS - 1)), rms]);
      const s = (Date.now() - began) / 1000;
      setSeconds(s);
      if (s >= MAX_SECONDS) stopAt.current();
    }, 80);

    rec.onstop = () => {
      clearInterval(tick);
      void ctx.close();
      const secs = (Date.now() - began) / 1000;
      if (secs < 0.6) {
        setState('short');
        return;
      }
      setState('ready');
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      onChange({ kind: 'recording', blob, url: URL.createObjectURL(blob), seconds: Math.min(secs, MAX_SECONDS) });
    };
    stopAt.current = () => rec.state === 'recording' && rec.stop();
    recorder.current = rec;
    rec.start();
    setState('recording');
  };

  const onPressIn = () => {
    if (recorder.current?.state === 'recording') {
      stopAt.current(); // tap mode: second tap stops
      return;
    }
    pressedAt.current = Date.now();
    void start();
  };

  const onPressOut = () => {
    // Released after a real hold: stop. A release within 0.5s (a tap, or the browser cancelling the press)
    // leaves it recording until the next tap, so it never starts and vanishes.
    if (recorder.current?.state === 'recording' && pressedAt.current && Date.now() - pressedAt.current > 500) stopAt.current();
  };

  const clear = () => {
    audio.current?.pause();
    setPlaying(false);
    if (value) URL.revokeObjectURL(value.url);
    onChange(null);
  };

  const togglePreview = () => {
    if (!value) return;
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    audio.current = new Audio(value.url);
    audio.current.onended = () => setPlaying(false);
    void audio.current.play();
    setPlaying(true);
  };

  if (compact) {
    const pill = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: state === 'recording' ? C.danger : C.line,
      backgroundColor: C.bg,
    };
    if (value)
      return (
        <View style={pill}>
          <Pressable onPress={togglePreview} hitSlop={6}>
            <Txt size={13} weight="semi" color={C.accent}>
              {playing ? COPY.voice.pause : COPY.voice.playShort(fmt(value.seconds))}
            </Txt>
          </Pressable>
          <Pressable onPress={clear} hitSlop={6}>
            <Txt size={13} color={C.muted}>
              {COPY.voice.remove}
            </Txt>
          </Pressable>
        </View>
      );
    if (!canRecord) return null;
    const label =
      state === 'recording'
        ? `● ${fmt(seconds)} / ${fmt(MAX_SECONDS)}`
        : state === 'asking'
          ? COPY.voice.askingShort
          : state === 'short'
            ? COPY.voice.shortShort
            : state === 'denied'
              ? COPY.voice.deniedShort
              : COPY.voice.holdShort;
    return (
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut} style={pill}>
        {state === 'recording' ? (
          <View style={{ width: 48, height: 18, overflow: 'hidden', justifyContent: 'center' }}>
            <Waveform levels={levels.slice(-12)} color={C.danger} />
          </View>
        ) : null}
        <Txt size={13} weight="semi" color={state === 'recording' || state === 'denied' ? C.danger : state === 'short' ? C.warning : C.text}>
          {label}
        </Txt>
      </Pressable>
    );
  }

  if (value)
    return (
      <View style={{ gap: 8, borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 12 }}>
        <Txt weight="semi">{COPY.voice.recorded(fmt(value.seconds))}</Txt>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Pressable onPress={togglePreview}>
            <Txt weight="semi" color={C.accent}>
              {playing ? COPY.voice.pause : COPY.voice.play}
            </Txt>
          </Pressable>
          <Pressable onPress={clear}>
            <Txt color={C.muted}>{COPY.voice.remove}</Txt>
          </Pressable>
        </View>
      </View>
    );

  return (
    <View style={{ gap: 8 }}>
      {canRecord ? (
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: state === 'recording' ? C.danger : C.line,
            backgroundColor: state === 'recording' ? C.surface2 : 'transparent',
          }}>
          <Txt weight="semi" color={state === 'recording' ? C.danger : C.text}>
            {state === 'recording' ? `● ${fmt(seconds)} / ${fmt(MAX_SECONDS)}` : COPY.voice.hold}
          </Txt>
          {state === 'recording' ? <Waveform levels={levels} color={C.danger} /> : null}
          <Txt size={11} color={C.muted}>
            {state === 'recording' ? COPY.voice.stopHint : ''}
          </Txt>
        </Pressable>
      ) : null}
      {state === 'asking' ? (
        <Txt size={13} color={C.muted}>
          {COPY.voice.asking}
        </Txt>
      ) : state === 'short' ? (
        <Txt size={13} color={C.warning}>
          {COPY.voice.short}
        </Txt>
      ) : state === 'ready' && !value ? (
        <Txt size={13} color={C.muted}>
          {COPY.voice.ready}
        </Txt>
      ) : state === 'denied' ? (
        <Note tone="warn" title={COPY.voice.denied} />
      ) : null}
    </View>
  );
}
