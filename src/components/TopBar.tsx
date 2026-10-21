import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { act, useDB } from '@/lib/api';
import { useDevice } from '@/lib/device';
import { ACCESS_LABEL, COUNTRY_NAME, getPolicy, KID_PERMISSIONS, PERM_LABEL } from '@/lib/policy';
import { C } from '@/lib/theme';
import { PERSONA_ORDER } from '@/lib/seed';
import type { Country } from '@/lib/types';

import { Btn, Chip, Eyebrow, Rule, Txt } from './ui';

const COUNTRIES: Country[] = ['US', 'DE', 'GB', 'KR'];

export function TopBar() {
  const insets = useSafeAreaInsets();
  const db = useDB();
  const { persona, setPersona } = useDevice();
  const [open, setOpen] = useState(false);
  const [demo, setDemo] = useState(false);
  if (!db) return <View style={{ height: insets.top + 60, backgroundColor: C.bg }} />;
  const user = db.users[persona];
  if (!user) return <View style={{ height: insets.top + 60, backgroundColor: C.bg }} />;
  const policy = getPolicy(user);
  const personas = PERSONA_ORDER.filter((p) => db.users[p]);

  const statusLine =
    policy.status === 'pass'
      ? `consent age ${policy.consentAge ?? '—'}`
      : policy.status === 'pending'
        ? 'waiting for a parent'
        : policy.status === 'none'
          ? 'not checked yet'
          : policy.status;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <Txt weight="display" size={20} style={{ letterSpacing: -0.5 }}>
          Kardza
        </Txt>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {personas.map((p) => (
            <Chip
              key={p}
              label={db.users[p].name}
              active={p === persona}
              onPress={() => setPersona(p)}
            />
          ))}
          <Chip label="···" active={demo} onPress={() => setDemo((d) => !d)} />
        </View>
      </View>

      {demo ? (
        <View style={[styles.row, { justifyContent: 'flex-start', flexWrap: 'wrap', gap: 4 }]}>
          <Eyebrow>{user.name} in</Eyebrow>
          {COUNTRIES.map((c) => (
            <Chip
              key={c}
              label={c}
              active={user.country === c}
              onPress={() => act({ action: 'setCountry', persona, country: c })}
            />
          ))}
          <Chip label="Reset demo" onPress={() => act({ action: 'reset' })} color={C.danger} />
        </View>
      ) : null}

      <Pressable onPress={() => setOpen(true)} style={styles.banner}>
        <Txt size={12} color={C.muted} numberOfLines={1}>
          <Txt size={12} weight="semi" color={policy.source === 'simulated' ? C.warning : C.accent}>
            {policy.source === 'simulated' ? 'Simulated k-ID rules' : 'Rules from k-ID'}
          </Txt>
          {`  ·  ${user.name}, ${policy.age}  ·  ${policy.countryName}  ·  ${statusLine}`}
        </Txt>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              <Eyebrow color={C.accent}>Rules from k-ID</Eyebrow>
              <Txt weight="display" size={22}>
                {user.name}, {policy.age} · {COUNTRY_NAME[user.country]}
              </Txt>
              <Txt color={C.muted}>
                {policy.status === 'pass'
                  ? `k-ID checked ${user.name}'s age and ${COUNTRY_NAME[user.country]}'s rules. ${
                      policy.consentAge ? `Digital consent age here is ${policy.consentAge}.` : ''
                    }`
                  : `k-ID hasn't finished checking ${user.name} in ${COUNTRY_NAME[user.country]} yet (${statusLine}).`}
              </Txt>
              <Rule />
              {KID_PERMISSIONS.map((n) => {
                const a = policy.access[n];
                return (
                  <View key={n} style={styles.permRow}>
                    <Txt>{PERM_LABEL[n]}</Txt>
                    <Txt
                      weight="semi"
                      color={a === 'on' ? C.success : a === 'parent' ? C.warning : a === 'optin' ? C.accent : C.muted}>
                      {ACCESS_LABEL[a]}
                    </Txt>
                  </View>
                );
              })}
              <Rule />
              <Txt size={12} color={C.muted}>
                {policy.source === 'claim'
                  ? 'Verified on our server with k-ID (claim).'
                  : policy.source === 'client'
                    ? 'Reported by the k-ID SDK on this device.'
                    : ''}
              </Txt>
              <Btn
                label="Change in k-ID settings"
                onPress={() => {
                  setOpen(false);
                  router.push('/settings');
                }}
              />
              <Btn label="Close" kind="quiet" onPress={() => setOpen(false)} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  banner: { paddingVertical: 4 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  sheet: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 20,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
