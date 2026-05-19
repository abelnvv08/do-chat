import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — DO Chat',
  description: 'DO Chat Privacy Policy. Learn how we collect, use, and protect your personal information.',
}

const sections = [
  {
    title: '1. Who We Are',
    body: 'DO Chat ("we," "our," or "us") is a company incorporated in the United States. We operate a professional messaging platform available at getdochat.com and through our mobile applications. For privacy-related inquiries, contact us at privacy@getdochat.com.',
  },
  {
    title: '2. Information We Collect',
    body: `We collect only what is necessary to provide the Service:

Phone number — used for account creation and SMS verification (via Twilio).
Profile name and photo — optional, to personalize your experience.
Messages and files — encrypted end-to-end using AES-256-GCM and ECDH P-256. We cannot read your message content.
Push notification tokens — to deliver real-time alerts for messages, calls, and tasks.
Payment information — processed directly by Stripe. We never store card numbers or full payment details.
Usage data — aggregate analytics for product improvement (e.g., feature usage, error reports via Sentry).
Device and browser information — for debugging and compatibility purposes.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your data solely to operate and improve the Service:

• Create and manage your account
• Enable messaging, file sharing, voice and video calls, and AI features
• Process subscription payments and issue receipts
• Send service notifications (new messages, missed calls, task assignments)
• Detect and prevent fraud, abuse, or unauthorized access
• Improve platform performance and fix bugs
• Comply with applicable U.S. laws and legal obligations

We do not sell, rent, or share your personal data with third parties for advertising or marketing purposes — ever.`,
  },
  {
    title: '4. End-to-End Encryption',
    body: `DO Chat is built with privacy at its core:

• All direct messages and group messages are encrypted at rest using AES-256-GCM.
• Encryption keys are derived per-session using ECDH P-256 and are never stored on our servers.
• Voice and video calls use WebRTC with DTLS-SRTP encryption.
• DO Chat staff cannot read your private conversations.
• Messages sent to DO AI (our AI assistant) are processed by Anthropic's API and are not end-to-end encrypted — use discretion when sharing sensitive information with AI features.`,
  },
  {
    title: '5. Third-Party Service Providers',
    body: `We share data only with the following service providers, each bound by data processing agreements:

• Supabase — database, authentication, and file storage (USA)
• Stripe — payment processing and subscription management (USA)
• Vercel — application hosting and global CDN (USA)
• Anthropic — AI message processing for DO AI features (USA)
• Twilio — SMS verification for account login (USA)
• Sentry — error monitoring and crash reporting (USA)

We do not use your data for cross-app tracking or advertising networks.`,
  },
  {
    title: '6. Your Rights Under U.S. Law (CCPA)',
    body: `If you are a California resident, the California Consumer Privacy Act (CCPA) grants you the following rights:

Right to Know — You can request a copy of the personal information we hold about you.
Right to Delete — You can request that we delete your personal information.
Right to Opt Out — We do not sell personal data. There is nothing to opt out of.
Right to Non-Discrimination — We will not discriminate against you for exercising any of these rights.

To exercise your rights, use the "Delete Account" option in your Profile settings, or email privacy@getdochat.com. We respond to all CCPA requests within 45 days.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your data as long as your account is active.

When you delete your account:
• Messages and files are permanently deleted within 30 days.
• Profile information is removed immediately.
• Billing records are retained for 7 years as required by U.S. tax law.

You may export your data at any time from your Profile settings before deleting your account.`,
  },
  {
    title: '8. Cookies and Local Storage',
    body: 'DO Chat uses strictly necessary session cookies to maintain your authenticated session. We do not use advertising cookies, cross-site tracking cookies, or third-party analytics cookies. Local storage (localStorage) is used solely for interface preferences such as dark mode and language settings.',
  },
  {
    title: `9. Children's Privacy`,
    body: `DO Chat is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe a child has created an account or provided us with personal information, please contact us immediately at privacy@getdochat.com and we will promptly delete that information.`,
  },
  {
    title: '10. Security',
    body: 'We implement industry-standard security measures including HTTPS everywhere, encrypted data storage, access controls on all production systems, and regular security reviews. In the event of a data breach that affects your personal information, we will notify you in accordance with applicable U.S. state breach notification laws.',
  },
  {
    title: '11. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of material changes via in-app notification at least 30 days before they take effect. The "Last updated" date at the top of this page will always reflect when the policy was last revised. Continued use of the Service after changes take effect constitutes acceptance of the updated policy.',
  },
  {
    title: '12. Contact Us',
    body: `For privacy questions, data requests, or concerns:

Email: privacy@getdochat.com
Response time: within 5 business days for general inquiries, 45 days for CCPA requests.

We are committed to resolving any privacy concern you may have promptly and transparently.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#0f172a] text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/landing" className="text-blue-400 text-sm hover:text-blue-300 transition-colors mb-6 inline-flex items-center gap-1.5">
            ← Back to DO Chat
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-lg shrink-0">🔒</div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-gray-400 text-sm">Last updated: May 18, 2026 · Effective immediately</p>
          <p className="text-gray-300 text-sm mt-3 max-w-xl leading-relaxed">
            Your privacy matters. DO Chat is built with end-to-end encryption by default — we cannot read your messages. This policy explains exactly what data we collect, why, and your rights.
          </p>
        </div>
      </div>

      {/* Table of contents */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contents</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {sections.map(s => (
              <a key={s.title} href={`#${s.title.replace(/\s+/g, '-').toLowerCase()}`}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {sections.map(s => (
          <section key={s.title} id={s.title.replace(/\s+/g, '-').toLowerCase()}>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{s.title}</h2>
            <p className="text-gray-600 text-sm leading-7 whitespace-pre-line">{s.body}</p>
          </section>
        ))}

        <div className="pt-8 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</Link>
            <Link href="/landing" className="hover:text-gray-700 transition-colors">Home</Link>
          </div>
          <span>© 2026 DO Chat Inc. All rights reserved.</span>
        </div>
      </div>
    </div>
  )
}
