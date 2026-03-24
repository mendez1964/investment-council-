'use client'

import { useRouter } from '@/navigation'

export default function TermsPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>Terms of Service</h1>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>Effective date: January 1, 2025</p>
          </div>
          <button
            onClick={() => router.back()}
            style={{ fontSize: 13, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '36px 40px', lineHeight: 1.75, color: '#374151', fontSize: 14 }}>

          <Section title="1. Acceptance of Terms">
            By accessing or using Investment Council ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
          </Section>

          <Section title="2. Description of Service">
            Investment Council is an AI-powered investment research and analysis platform. The Service provides market data, AI-generated analysis, stock and crypto picks, and educational content. All content is for informational and educational purposes only.
          </Section>

          <Section title="3. Not Financial Advice">
            <strong>Investment Council does not provide financial, investment, legal, or tax advice.</strong> All content, analysis, picks, and AI-generated responses are for educational and informational purposes only and should not be construed as investment recommendations or financial advice. Always consult a licensed financial professional before making investment decisions. Past performance is not indicative of future results.
          </Section>

          <Section title="4. Eligibility">
            You must be at least 18 years old to use the Service. By using the Service, you represent that you meet this requirement and that all information you provide is accurate and complete.
          </Section>

          <Section title="5. Account & API Keys">
            You are responsible for maintaining the confidentiality of your account credentials and any API keys stored in your profile. You agree to notify us immediately of any unauthorized use of your account. Investment Council stores API keys in encrypted form and does not use them for any purpose other than fulfilling your requests.
          </Section>

          <Section title="6. Subscriptions & Billing">
            Paid plans (Trader, Pro) are billed on a recurring basis through Stripe. You may cancel at any time through your account settings. Cancellations take effect at the end of the current billing period. We do not offer refunds for partial billing periods. Trial periods are available for new subscribers as described at checkout.
          </Section>

          <Section title="7. Acceptable Use">
            You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to reverse-engineer, scrape, or copy the Service; (c) share your account credentials with others; (d) use automated tools to access the Service in a manner that exceeds normal usage; (e) submit false or misleading information.
          </Section>

          <Section title="8. Intellectual Property">
            All content, branding, and technology comprising the Service are owned by Investment Council or its licensors. You may not reproduce, distribute, or create derivative works without express written permission.
          </Section>

          <Section title="9. Third-Party Data & APIs">
            The Service integrates with third-party data providers and AI models. We do not guarantee the accuracy, completeness, or timeliness of any data sourced from third parties. Market data may be delayed.
          </Section>

          <Section title="10. Limitation of Liability">
            To the maximum extent permitted by law, Investment Council shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including any investment losses. Our total liability shall not exceed the amount you paid for the Service in the three months preceding the claim.
          </Section>

          <Section title="11. Disclaimer of Warranties">
            The Service is provided "as is" without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be error-free or uninterrupted.
          </Section>

          <Section title="12. Modifications">
            We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms. We will provide notice of material changes via email or in-app notification where practicable.
          </Section>

          <Section title="13. Termination">
            We may suspend or terminate your account at our discretion if you violate these Terms. You may terminate your account at any time by canceling your subscription and contacting us.
          </Section>

          <Section title="14. Governing Law">
            These Terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except where prohibited by law.
          </Section>

          <Section title="15. Contact">
            For questions about these Terms, contact us at: <a href="mailto:support@investmentcouncil.io" style={{ color: '#2563eb' }}>support@investmentcouncil.io</a>
          </Section>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 8px', letterSpacing: '-0.01em' }}>{title}</h2>
      <p style={{ margin: 0, color: '#4b5563' }}>{children}</p>
    </div>
  )
}
