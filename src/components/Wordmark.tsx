import { createElement } from 'react';
import { Platform } from 'react-native';

import { Txt } from '@/components/ui';
import { C, F } from '@/lib/theme';

/** The Kardza logo text: signature gradient, Space Grotesk Bold, tight tracking. */
export function Wordmark({ size = 22 }: { size?: number }) {
  if (Platform.OS !== 'web')
    return (
      <Txt size={size} color={C.accent} style={{ fontFamily: F.displayBold, letterSpacing: -0.5 }}>
        Kardza
      </Txt>
    );
  return createElement(
    'span',
    {
      style: {
        fontFamily: F.displayBold,
        fontSize: size,
        lineHeight: `${Math.round(size * 1.2)}px`,
        letterSpacing: -0.5,
        background: `linear-gradient(90deg, ${C.grad.join(', ')})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block',
      },
    },
    'Kardza',
  );
}
