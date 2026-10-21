import { LegalPage } from '@/components/Legal';

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of service"
      intro="By using Kardza you agree to these terms. Kardza is a hackathon prototype, so features and data may change or reset without notice."
      sections={[
        {
          title: 'Who can use Kardza',
          body: [
            "Anyone, with rules that fit their age and country. k-ID decides those rules. Where the law says a parent must consent, a parent approves first and can change what their child may do.",
          ],
        },
        {
          title: 'Trading',
          body: [
            'Trades are between players. Kardza shows a fair-value check, but prices are estimates, not guarantees. A photo cannot prove a card is real, so we flag cards that need a second look instead of calling them authentic.',
            "Kids' trades need a parent's OK before any cards move.",
          ],
        },
        {
          title: 'Be safe and be fair',
          body: [
            "Don't share phone numbers, emails or social handles. Don't ask anyone to keep secrets or meet in person. Don't pressure or scam other players.",
            'Breaking these rules lowers your credibility, and we may block messages or your account.',
          ],
        },
        {
          title: 'Purchases',
          body: [
            'Digital items are sold through FastSpring under its terms. Teens can buy small items within a spending limit; kids ask a parent, who pays.',
          ],
        },
        {
          title: 'No warranty',
          body: ['Kardza is provided as-is while we build it. We are not liable for trades made between players.'],
        },
      ]}
    />
  );
}
