import { Eyebrow, H, Page, Txt } from '@/components/ui';
import { C } from '@/lib/theme';

export default function Screen() {
  return (
    <Page>
      <Eyebrow>Kardza</Eyebrow>
      <H>Scan a card</H>
      <Txt color={C.muted}>Coming in the next build step.</Txt>
    </Page>
  );
}
