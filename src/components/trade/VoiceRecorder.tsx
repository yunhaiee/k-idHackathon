// Hold-to-record voice note for offers (browser mic via MediaRecorder), with a live timer + waveform and a
// playback preview before sending. "Use sample voice note" attaches the bundled file instead.
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Btn, Note, Txt } from '@/components/ui';
import { apiUrl, postJSON } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { C } from '@/lib/theme';
import type { PersonaId } from '@/lib/types';

export type VoiceNote = { kind: 'recording'; blob: Blob; url: string; seconds: number } | { kind: 'sample' };

const MAX_SECONDS = 15;
const BARS = 40;

/** Upload a voice note for one offer; the server runs Modulate on it. */
export async function sendVoiceNote(offerId: string, fromId: PersonaId, voice: VoiceNote) {
  if (voice.kind === 'sample') return postJSON('/api/voice', { offerId, fromId });
  const fd = new FormData();
  fd.append('offerId', offerId);
  fd.append('fromId', fromId);
  fd.append('file', voice.blob, voice.blob.type.includes('mp4') ? 'voice.mp4' : 'voice.webm');
  return fetch(apiUrl('/api/voice'), { method: 'POST', body: fd });
}

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
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

function SamplePreview() {
  const player = useAudioPlayer(require('../../../assets/samples/voice-note.mp4'));
  return (
    <Pressable
      onPress={() => {
        player.seekTo(0);
        player.play();
      }}>
      <Txt weight="semi" color={C.accent}>
        {COPY.voice.play}
      </Txt>
    </Pressable>
  );
}

export function VoiceRecorder({ value, onChange }: { value: VoiceNote | null; onChange: (v: VoiceNote | null) => void }) {
  const [state, setState] = useState<'idle' | 'asking' | 'ready' | 'recording' | 'denied'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const holding = useRef(false);
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
    holding.current = true;
    if (!stream.current) {
      // First use: the browser asks for the mic. If the finger lifted meanwhile, wait for the next hold.
      setState('asking');
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setState('denied');
        return;
      }
      if (!holding.current) {
        setState('ready');
        return;
      }
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
      setState('ready');
      if (secs < 0.6) return; // a tap, not a recording
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      onChange({ kind: 'recording', blob, url: URL.createObjectURL(blob), seconds: Math.min(secs, MAX_SECONDS) });
    };
    stopAt.current = () => rec.state === 'recording' && rec.stop();
    recorder.current = rec;
    rec.start();
    setState('recording');
  };

  const stop = () => {
    holding.current = false;
    stopAt.current();
  };

  const clear = () => {
    audio.current?.pause();
    setPlaying(false);
    if (value?.kind === 'recording') URL.revokeObjectURL(value.url);
    onChange(null);
  };

  const togglePreview = () => {
    if (value?.kind !== 'recording') return;
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

  if (value)
    return (
      <View style={{ gap: 8, borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 12 }}>
        <Txt weight="semi">{value.kind === 'sample' ? COPY.voice.sampleAttached : COPY.voice.recorded(fmt(value.seconds))}</Txt>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          {value.kind === 'sample' ? (
            <SamplePreview />
          ) : (
            <Pressable onPress={togglePreview}>
              <Txt weight="semi" color={C.accent}>
                {playing ? COPY.voice.pause : COPY.voice.play}
              </Txt>
            </Pressable>
          )}
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
          onPressIn={start}
          onPressOut={stop}
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
        </Pressable>
      ) : null}
      {state === 'asking' ? (
        <Txt size={13} color={C.muted}>
          {COPY.voice.asking}
        </Txt>
      ) : state === 'ready' && !value ? (
        <Txt size={13} color={C.muted}>
          {COPY.voice.ready}
        </Txt>
      ) : state === 'denied' ? (
        <Note tone="warn" title={COPY.voice.denied} />
      ) : null}
      <Btn label={COPY.voice.sample} kind="quiet" onPress={() => onChange({ kind: 'sample' })} />
    </View>
  );
}
