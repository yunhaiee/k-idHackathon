import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';

import { Btn, Chip, Note, Txt } from '@/components/ui';
import { apiUrl, postJSON, refreshDB } from '@/lib/api';
import type { Policy } from '@/lib/policy';
import { C, F } from '@/lib/theme';
import type { PersonaId } from '@/lib/types';

const PRESETS = ['Is this still available?', 'Can you add another card?', 'No thanks', "Deal! Let's trade."];

async function uploadVoice(offerId: string, fromId: PersonaId, uri: string) {
  const fd = new FormData();
  fd.append('offerId', offerId);
  fd.append('fromId', fromId);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    fd.append('file', blob, blob.type.includes('webm') ? 'voice.webm' : 'voice.mp4');
  } else {
    fd.append('file', { uri, name: 'voice.m4a', type: 'audio/mp4' } as unknown as Blob);
  }
  await fetch(apiUrl('/api/voice'), { method: 'POST', body: fd });
}

export function Composer({ offerId, me, policy }: { offerId: string; me: PersonaId; policy: Policy }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder);

  const sendText = async (t: string) => {
    if (!t.trim()) return;
    setBusy('Checking message…');
    try {
      await postJSON('/api/message', { offerId, fromId: me, text: t });
      setText('');
      await refreshDB();
    } finally {
      setBusy(null);
    }
  };

  const sample = async () => {
    setBusy('Modulate is listening…');
    try {
      await postJSON('/api/voice', { offerId, fromId: me });
      await refreshDB();
    } finally {
      setBusy(null);
    }
  };

  const toggleRecord = async () => {
    if (rec.isRecording) {
      await recorder.stop();
      if (!recorder.uri) return;
      setBusy('Modulate is listening…');
      try {
        await uploadVoice(offerId, me, recorder.uri);
        await refreshDB();
      } finally {
        setBusy(null);
      }
      return;
    }
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return;
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const chatOff = policy.chatMode === 'none';
  const voiceOn = policy.access['voice-chat'] === 'on';

  return (
    <View style={{ gap: 10 }}>
      {chatOff ? (
        <View style={{ gap: 6 }}>
          <Note title="Messages are off for you">
            {policy.access['text-chat-private'] === 'optin'
              ? 'k-ID lets you turn them on yourself.'
              : "k-ID's rules for your age and country don't allow messages."}
          </Note>
          {policy.access['text-chat-private'] === 'optin' ? (
            <Btn label="Turn on in k-ID settings" kind="quiet" onPress={() => router.push('/settings')} />
          ) : null}
        </View>
      ) : policy.chatMode === 'presets' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {PRESETS.map((p) => (
            <Chip key={p} label={p} onPress={() => sendText(p)} />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a message"
            placeholderTextColor={C.muted}
            onSubmitEditing={() => sendText(text)}
            style={{
              flex: 1,
              color: C.text,
              fontFamily: F.body,
              fontSize: 15,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
          <Btn label="Send" onPress={() => sendText(text)} />
        </View>
      )}

      {voiceOn ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn
            label={rec.isRecording ? 'Stop and send' : 'Record voice note'}
            kind={rec.isRecording ? 'danger' : 'quiet'}
            onPress={toggleRecord}
            style={{ flex: 1 }}
          />
          <Btn label="Use sample voice note" kind="quiet" onPress={sample} style={{ flex: 1 }} />
        </View>
      ) : !chatOff ? (
        <Txt size={12} color={C.muted}>
          Voice notes are off for you (k-ID).
        </Txt>
      ) : null}
      {busy ? <Txt color={C.muted}>{busy}</Txt> : null}
    </View>
  );
}
