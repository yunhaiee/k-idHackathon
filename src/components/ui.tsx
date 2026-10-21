import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';

import { C, F } from '@/lib/theme';

type TxtProps = TextProps & { size?: number; color?: string; weight?: 'body' | 'med' | 'semi' | 'display' };

export function Txt({ size = 15, color = C.text, weight = 'body', style, ...rest }: TxtProps) {
  const fontFamily =
    weight === 'display' ? F.display : weight === 'semi' ? F.bodySemi : weight === 'med' ? F.bodyMed : F.body;
  return <Text {...rest} style={[{ color, fontSize: size, fontFamily, lineHeight: size * 1.35 }, style]} />;
}

export function H({ children, size = 26 }: { children: ReactNode; size?: number }) {
  return (
    <Txt weight="display" size={size} style={{ letterSpacing: -0.4 }}>
      {children}
    </Txt>
  );
}

export function Eyebrow({ children, color = C.muted }: { children: ReactNode; color?: string }) {
  return (
    <Txt size={11} weight="semi" color={color} style={{ letterSpacing: 1.4, textTransform: 'uppercase' }}>
      {children}
    </Txt>
  );
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  big,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'quiet' | 'danger';
  big?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const pad = big ? 18 : 13;
  const inner = loading ? (
    <ActivityIndicator color={C.text} />
  ) : (
    <Txt weight="semi" size={big ? 18 : 15} color={kind === 'quiet' ? C.text : '#fff'}>
      {label}
    </Txt>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.8 : 1, borderRadius: 14 }, style]}>
      {kind === 'primary' ? (
        <LinearGradient
          colors={C.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, { paddingVertical: pad }]}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.btn,
            { paddingVertical: pad, borderWidth: 1, borderColor: kind === 'danger' ? C.danger : C.line },
          ]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: C.surface2, borderColor: color ?? C.accent }]}>
      <Txt size={13} weight={active ? 'semi' : 'med'} color={active ? C.text : C.muted}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Page({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={styles.page}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page}>
      {children}
    </ScrollView>
  );
}

export function Rule() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginVertical: 14 }} />;
}

/** A left-ruled note: used for safety notices and k-ID reasons. Not a heavy card. */
export function Note({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; title?: string; children?: ReactNode }) {
  const color = tone === 'warn' ? C.warning : tone === 'danger' ? C.danger : tone === 'ok' ? C.success : C.accent;
  return (
    <View style={{ borderLeftWidth: 2, borderLeftColor: color, paddingLeft: 12, paddingVertical: 4, gap: 4 }}>
      {title ? (
        <Txt weight="semi" color={color}>
          {title}
        </Txt>
      ) : null}
      {typeof children === 'string' ? <Txt color={C.muted}>{children}</Txt> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  page: { padding: 20, gap: 14, paddingBottom: 60, maxWidth: 720, width: '100%', alignSelf: 'center' },
});
