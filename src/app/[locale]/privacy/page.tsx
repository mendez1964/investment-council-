'use client'

import { useRouter } from '@/navigation'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>Privacy Policy</h1>
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

          <Section title="1. Information We Collect">
            <strong>Account Information:</strong> Email address, display name, and subscription status collected at registration and through your profile.<br /><br />
            <strong>API Keys:</strong> If you choose to add your own AI provider API keys, they are stored encrypted using industry-standard encryption. They are used solely to fulfill your requests and are never shared.<br /><br />
            <strong>Usage Data:</strong> We collect session-level data including queries made, AI provider used, and token usage for cost tracking purposes displayed to you in the app.<br /><br />
            <strong>Payment Information:</strong> Payment details are processed by Stripe and never stored on our servers. We receive subscription status and customer identifiers from Stripe.
          </Section>

          <Section title="2. How We Use Your Information">
            We use collected information to: (a) provide and improve the Service; (b) process payments and manage subscriptions; (c) send email alerts and briefings you have subscribed to; (d) display your usage statistics; (e) enforce our Terms of Service; (f) communicate service updates and important notices.
          </Section>

          <Section title="3. AI Queries & Data">
            Your chat queries are sent to AI providers (Anthropic Claude, OpenAI, Google Gemini, or xAI Grok) to generate responses. If you use Investment Council's shared key, queries are processed under our provider accounts. If you use your own API key, queries are processed under your provider account directly. We do not store the content of individual chat messages in our database.
          </Section>

          <Section title="4. Email Communications">
            If you subscribe to email alerts, we send morning briefings, end-of-day recaps, AI picks, and market alerts based on your preferences. Every email includes an unsubscribe link. You may update your preferences at any time in the Alerts section of the app.
          </Section>

          <Section title="5. Data Sharing">
            We do not sell your personal data. We share data only with: (a) <strong>Supabase</strong> — our database provider; (b) <strong>Stripe</strong> — for payment processing; (c) <strong>Resend</strong> — for transactional email delivery; (d) <strong>AI providers</strong> (Anthropic, OpenAI, Google, xAI) — solely to process your queries; (e) as required by law.
          </Section>

          <Section title="6. Data Security">
            We implement industry-standard security measures including encryption at rest and in transit, secure API key storage, and access controls. However, no system is completely secure. You are responsible for maintaining the security of your account credentials.
          </Section>

          <Section title="7. Data Retention">
            We retain your account data for as long as your account is active. Upon account deletion, we delete your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., billing records).
          </Section>

          <Section title="8. Your Rights">
            You have the right to: (a) access the personal data we hold about you; (b) correct inaccurate data; (c) request deletion of your data; (d) opt out of marketing emails at any time; (e) export your data. To exercise these rights, contact us at <a href="mailto:support@investmentcouncil.io" style={{ color: '#2563eb' }}>support@investmentcouncil.io</a>.
          </Section>

          <Section title="9. Cookies">
            We use essential cookies for authentication and session management. We do not use third-party tracking or advertising cookies. Your locale preference is stored in a cookie to remember your language setting.
          </Section>

          <Section title="10. Children's Privacy">
            The Service is not directed to children under 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, contact us immediately.
          </Section>

          <Section title="11. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notice. Continued use of the Service after changes constitutes acceptance of the revised Policy.
          </Section>

          <Section title="12. Contact">
            For privacy-related questions or requests, contact us at: <a href="mailto:support@investmentcouncil.io" style={{ color: '#2563eb' }}>support@investmentcouncil.io</a>
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
      <p style={{ margin: 0, color: '#4b5563', whiteSpace: 'pre-line' }}>{children}</p>
    </div>
  )
}
