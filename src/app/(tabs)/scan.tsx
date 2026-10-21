import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { Price } from '@/components/Price';
import { Btn, Eyebrow, H, Note, Page, Txt } from '@/components/ui';
import { act, postJSON, useDB } from '@/lib/api';
import { useDevice } from '@/lib/device';
import { getPolicy } from '@/lib/policy';
import { C } from '@/lib/theme';
import type { ScanResult } from '@/lib/types';

const SAMPLE = 'https://images.pokemontcg.io/base1/10_hires.png';

async function shrink(uri: string): Promise<string | undefined> {
  try {
    const rendered = await ImageManipulator.ImageManipulator.manipulate(uri).resize({ width: 1024 }).renderAsync();
    const saved = await rendered.saveAsync({ base64: true, compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
    return saved.base64 ?? undefined;
  } catch {
    return undefined;
  }
}

export default function Scan() {
  const db = useDB();
  const { persona } = useDevice();
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [listed, setListed] = useState(false);
  if (!db) return null;
  const me = db.users[persona];
  const policy = getPolicy(me);

  const run = async (body: object, preview: string) => {
    setPhoto(preview);
    setResult(null);
    setListed(false);
    setBusy(true);
    try {
      setResult(await postJSON<ScanResult>('/api/scan', body));
    } finally {
      setBusy(false);
    }
  };

  const pick = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const asset = res.assets[0];
    const b64 = (await shrink(asset.uri)) ?? asset.base64 ?? undefined;
    if (!b64) return;
    await run({ imageBase64: b64, mimeType: 'image/jpeg' }, asset.uri);
  };

  return (
    <Page>
      <Eyebrow>Scan · Gemini</Eyebrow>
      <H>{policy.bigUI ? 'What card is this?' : 'Scan a card'}</H>

      {policy.canScan === 'off' ? (
        <Note tone="warn" title="Scanning is off here">
          k-ID's rules for your age and country don't allow camera or photo uploads to AI.
        </Note>
      ) : (
        <View style={{ gap: 10 }}>
          {policy.canScan === 'on' ? (
            <>
              <Btn label="Take a photo" onPress={() => pick(true)} big={policy.bigUI} />
              <Btn label="Choose a photo" kind="quiet" onPress={() => pick(false)} />
            </>
          ) : policy.canScan === 'optin' ? (
            <View style={{ gap: 8 }}>
              <Note title="Camera and Photo to AI are off">
                k-ID lets you turn these on yourself. Until then, try the sample card.
              </Note>
              <Btn label="Turn on in k-ID settings" kind="quiet" onPress={() => router.push('/settings')} />
            </View>
          ) : (
            <Note title="Camera needs a parent's OK">
              k-ID lets a parent turn on the camera for you. Until then, try the sample card.
            </Note>
          )}
          <Btn label="Use sample card" kind="quiet" onPress={() => run({ sampleUrl: SAMPLE }, SAMPLE)} />
        </View>
      )}

      {photo ? <Image source={photo} style={{ width: '100%', height: 300 }} contentFit="contain" /> : null}
      {busy ? <Txt color={C.muted}>Gemini is looking at your card…</Txt> : null}

      {result ? (
        <View style={{ gap: 10 }}>
          <Eyebrow color={result.simulated ? C.warning : C.accent}>
            {result.simulated ? 'Simulated · Gemini unavailable' : `Identified by ${result.model ?? 'Gemini'}`}
          </Eyebrow>
          <H size={22}>{result.name}</H>
          <Txt color={C.muted}>
            {result.set} · {result.number}
          </Txt>
          <Price usd={result.estimatedPriceUsd} policy={policy} />
          {result.fakeRisk === 'high' ? (
            <Note tone="danger" title="Needs a second look">
              {result.reasons.join(' ')}
            </Note>
          ) : result.fakeRisk === 'medium' ? (
            <Note tone="warn" title="Check this one closely">
              {result.reasons.join(' ')}
            </Note>
          ) : policy.band !== 'kid' ? (
            <Txt size={13} color={C.muted}>
              Nothing looks off. {result.reasons.join(' ')}
            </Txt>
          ) : null}
          {policy.canTrade ? (
            <Btn
              label={listed ? 'Listed' : 'List it on the market'}
              disabled={listed}
              onPress={async () => {
                await act({
                  action: 'listScanned',
                  persona,
                  card: {
                    name: result.name,
                    set: result.set,
                    number: result.number,
                    priceUsd: Math.round(result.estimatedPriceUsd),
                    image: photo && photo.startsWith('http') ? photo : SAMPLE,
                  },
                });
                setListed(true);
              }}
            />
          ) : null}
        </View>
      ) : null}
    </Page>
  );
}
