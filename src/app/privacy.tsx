import { LegalPage } from '@/components/Legal';

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy policy"
      intro="Kardza is a trading-card marketplace for every age. We collect as little as we can, and less for kids. This is a hackathon prototype: the data below lives on a demo server and is reset often."
      sections={[
        {
          title: 'Age and country (k-ID)',
          body: [
            "k-ID checks each player's age and country, and asks a parent for consent when local law requires it. We receive the result: an age band, the country's rules, and which features are on. We never see a parent's email unless they are a Kardza user too.",
            'Those rules decide what each player can do on Kardza, such as trading, messages, voice notes and purchases.',
          ],
        },
        {
          title: 'Cards and photos',
          body: [
            'When you scan a card, the photo is sent to an AI model (Anthropic Claude, or Google Gemini as a fallback) to identify the card and estimate a price. We keep the card details, not the photo.',
          ],
        },
        {
          title: 'Messages and voice notes',
          body: [
            "Every message is checked before delivery. Text goes through our rules and an AI second opinion. Voice notes go to Modulate, which transcribes them, hides phone numbers and checks for scams and grooming signals.",
            'If a message to a child is risky, we hide it and tell their parent the reason. Parents see the reason, never the conversation.',
          ],
        },
        {
          title: 'Purchases (FastSpring)',
          body: [
            'FastSpring processes payments for digital items. Kardza never sees card numbers. For kids, the parent is the buyer.',
          ],
        },
        {
          title: 'Your choices',
          body: [
            "Players and parents can change permissions at any time in Kardza's settings, which are run by k-ID. Ask us to delete your data by email and we'll do it.",
          ],
        },
      ]}
    />
  );
}
