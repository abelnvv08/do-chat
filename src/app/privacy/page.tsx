import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — DO Chat',
  description: 'DO Chat Privacy Policy. Learn how we collect, use, and protect your personal information.',
}

const sections = [
  {
    title: '1. Who We Are',
    body: 'DO Chat ("we", "our", or "the Service") is a company registered in the United States. We operate a messaging platform that integrates AI-powered features. For privacy-related inquiries, contact us at: privacy@getdochat.com',
  },
  {
    title: '2. Information We Collect',
    body: 'We collect the following information to provide and improve our service:\n• Phone number or email address — for account creation and authentication\n• Profile name and photo — optional, to personalize your experience\n• Messages and files sent through the platform — encrypted end-to-end using AES-256-GCM\n• Push notification subscription tokens — to deliver message and call alerts\n• Payment data processed by Stripe — we never store card numbers directly\n• Usage logs — for analytics, security monitoring, and product improvement\n• Device and browser information — for debugging and compatibility',
  },
  {
    title: '3. How We Use Your Information',
    body: 'We use your data to:\n• Create and manage your account\n• Enable messaging, file sharing, and voice/video calls\n• Process subscription payments\n• Send service notifications (messages, calls, updates)\n• Detect and prevent fraud or abuse\n• Improve platform features and performance\n• Comply with applicable laws and legal obligations\n\nWe do not sell your personal data to third parties for advertising or marketing purposes.',
  },
  {
    title: '4. Encryption & Security',
    body: 'All text messages are encrypted at rest and in transit using AES-256-GCM. Encryption keys are derived from your session and are not accessible to DO Chat staff. Voice and video calls use WebRTC with DTLS/SRTP end-to-end encryption. We follow industry-standard security practices including HTTPS everywhere, regular security reviews, and access controls on all production systems.',
  },
  {
    title: '5. Third-Party Service Providers',
    body: 'We share data only with service providers necessary to operate the platform. Each provider is bound by data processing agreements:\n• Supabase — database and authentication (USA)\n• Stripe — payment processing (USA)\n• Vercel — application hosting and CDN (USA)\n• Anthropic — AI message processing (USA)\n\nData transfers to these providers are covered by Standard Contractual Clauses (SCCs) where required by GDPR.',
  },
  {
    title: '6. Your Rights (USA — CCPA)',
    body: 'If you are a California resident, under the California Consumer Privacy Act (CCPA) you have the right to:\n• Know what personal information we collect and how it is used\n• Request deletion of your personal information\n• Opt out of the sale of your personal information (we do not sell data)\n• Non-discrimination for exercising your privacy rights\n\nTo exercise these rights, use the "Delete Account" option in your Profile settings or email us at privacy@getdochat.com.',
  },
  {
    title: '7. Your Rights (EU/EEA — GDPR)',
    body: 'If you are located in the European Union or European Economic Area, under the General Data Protection Regulation (GDPR) you have the right to:\n• Access your personal data\n• Correct inaccurate data\n• Request erasure ("right to be forgotten")\n• Restrict or object to processing\n• Data portability\n• Lodge a complaint with your local supervisory authority\n\nOur legal basis for processing is contract performance (Art. 6(1)(b) GDPR) and, where applicable, legitimate interests (Art. 6(1)(f) GDPR).\n\nTo exercise your rights, email privacy@getdochat.com. We will respond within 30 days.',
  },
  {
    title: '8. Data Retention',
    body: 'We retain your data for as long as your account is active. When you delete your account:\n• Messages and files are permanently deleted within 30 days\n• Profile data is removed immediately\n• Billing records are retained for 7 years as required by US tax law\n\nYou can export your data at any time from your Profile settings before deleting your account.',
  },
  {
    title: '9. Cookies & Local Storage',
    body: 'DO Chat uses strictly necessary session cookies to maintain your authenticated session. We do not use third-party advertising or tracking cookies. Local storage (localStorage) is used solely for interface preferences such as theme and language settings.',
  },
  {
    title: '10. Children\'s Privacy',
    body: 'DO Chat is not directed to children under 13 years of age (or 16 in the EU). We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately at privacy@getdochat.com.',
  },
  {
    title: '11. Changes to This Policy',
    body: 'We may update this Privacy Policy periodically. We will notify you of material changes through an in-app notification at least 30 days before changes take effect. Continued use of the Service after changes constitutes acceptance of the updated policy.',
  },
  {
    title: '12. Contact Us',
    body: 'For privacy questions, data requests, or concerns:\n• Email: privacy@getdochat.com\n• Response time: within 5 business days for general inquiries, 30 days for GDPR/CCPA requests\n\nWe are committed to resolving any privacy concerns you may have.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/landing" className="text-blue-400 text-sm hover:text-blue-300 transition-colors mb-8 inline-block">← Back</Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-400 text-sm">Last updated: May 2026</p>
        </div>

        <div className="space-y-8">
          {sections.map(s => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold mb-3 text-blue-300">{s.title}</h2>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          <Link href="/landing" className="hover:text-gray-300 transition-colors">Home</Link>
          <span>© 2026 DO Chat</span>
        </div>
      </div>
    </div>
  )
}
