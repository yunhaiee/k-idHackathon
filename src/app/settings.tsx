import { Eyebrow, H, Page, Txt } from '@/components/ui';
import { C } from '@/lib/theme';

export default function Settings() {
  return (
    <Page>
      <Eyebrow>Settings</Eyebrow>
      <H>Permissions</H>
      <Txt color={C.muted}>k-ID settings come in step 2.</Txt>
    </Page>
  );
}
