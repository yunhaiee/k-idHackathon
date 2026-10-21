import { createElement } from 'react';
import { Platform } from 'react-native';

import { Txt } from '@/components/ui';
import { C, F } from '@/lib/theme';

/** Holo foil, used for the collection value. */
export const HOLO = ['#D3E6F5', '#DDD4F6', '#F2D8E7', '#F4E7CF'] as const;

/** Text filled with a left-to-right gradient (CSS background-clip on web, first color elsewhere). */
export function GradientText({
  children,
  size,
  colors,
  font = F.displayBold,
  tracking = -0.5,
}: {
  children: string;
  size: number;
  colors: readonly string[];
  font?: string;
  tracking?: number;
}) {
  if (Platform.OS !== 'web')
    return (
      <Txt size={size} color={colors[0]} style={{ fontFamily: font, letterSpacing: tracking }}>
        {children}
      </Txt>
    );
  return createElement(
    'span',
    {
      style: {
        fontFamily: font,
        fontSize: size,
        lineHeight: `${Math.round(size * 1.2)}px`,
        letterSpacing: tracking,
        background: `linear-gradient(90deg, ${colors.join(', ')})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block',
      },
    },
    children,
  );
}

/** The Kardza logo text: signature gradient, Space Grotesk Bold, tight tracking. */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <GradientText size={size} colors={C.grad}>
      Kardza
    </GradientText>
  );
}
