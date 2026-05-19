import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — DO Chat',
  description: 'DO Chat Terms of Service. Read the rules and conditions for using our platform.',
}

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or using DO Chat (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not access or use the Service. These Terms constitute a legally binding agreement between you and DO Chat Inc., a company incorporated in the United States ("DO Chat," "we," "our," or "us").',
  },
  {
    title: '2. The Service',
    body: `DO Chat is a professional messaging platform that provides:

• End-to-end encrypted direct and group messaging
• Voice and video calls using WebRTC
• File and media sharing with storage limits based on your plan
• DO AI — an AI assistant powered by Anthropic's Claude, integrated within your chats
• Task assignment and tracking between team members
• Progressive Web App (PWA) accessible from any modern browser
• Native mobile apps for iOS and Android`,
  },
  {
    title: '3. Eligibility & Account Registration',
    body: `To use DO Chat you must:

• Be at least 13 years old
• Provide accurate and complete registration information (phone number)
• Keep your login credentials confidential and not share your account
• Notify us immediately of any unauthorized account access at security@getdochat.com

You are solely responsible for all activity that occurs under your account. DO Chat reserves the right to refuse service or terminate accounts at its sole discretion.`,
  },
  {
    title: '4. Subscription Plans & Payments',
    body: `DO Chat offers the following plans:

Free — Core messaging features with limited AI usage and 2 GB storage.
Pro — Extended DO AI usage, 100 GB storage, and priority features. $12.99/month.
MAX — Maximum DO AI usage, 500 GB storage, and all features. $29.99/month.

Payment Terms:
• All payments are processed securely by Stripe, Inc.
• Prices are listed in USD and may be subject to applicable taxes.
• Subscriptions auto-renew monthly unless cancelled before the renewal date.
• You may cancel at any time from your Profile settings; access continues through the end of the paid period.
• Refunds are available within 7 days of initial purchase if you have not substantially used paid features.
• We reserve the right to change pricing with at least 30 days advance notice to existing subscribers.`,
  },
  {
    title: '5. Acceptable Use',
    body: `You agree not to use DO Chat to:

• Violate any applicable federal, state, or local law or regulation
• Send spam, phishing messages, or unsolicited bulk communications
• Distribute malware, viruses, or any harmful or disruptive code
• Harass, threaten, bully, or abuse other users
• Infringe on the intellectual property rights of others
• Impersonate any person or entity
• Attempt to gain unauthorized access to other user accounts or our systems
• Reverse engineer, decompile, or disassemble any part of the Service
• Use automated bots, scrapers, or tools to extract data from the Service
• Engage in any activity that could damage, overload, or impair the Service

Violations may result in immediate account suspension or termination without refund.`,
  },
  {
    title: '6. DO AI — Artificial Intelligence Features',
    body: `DO Chat includes DO AI, powered by Anthropic's Claude API. By using DO AI:

• You understand that AI-generated content may be inaccurate, incomplete, or outdated.
• You must not use DO AI to generate illegal, harmful, hateful, or deceptive content.
• Messages processed by DO AI are transmitted to Anthropic's API and are subject to Anthropic's usage policies.
• DO Chat is not liable for any decisions made based on AI-generated suggestions or outputs.
• AI usage is subject to limits based on your subscription plan.
• DO AI messages are not end-to-end encrypted — exercise discretion when sharing sensitive information.`,
  },
  {
    title: '7. Content Ownership',
    body: `You retain full ownership of all content you create and share through DO Chat — including messages, files, and media.

By using the Service, you grant DO Chat a limited, non-exclusive, royalty-free license to process, store, and transmit your content solely to operate and deliver the Service. This license ends when you delete your content or account.

DO Chat owns all rights to the platform, its design, branding, codebase, and features. Nothing in these Terms transfers any intellectual property rights to you beyond the right to use the Service as described herein.`,
  },
  {
    title: '8. Privacy',
    body: 'Your use of DO Chat is governed by our Privacy Policy, incorporated into these Terms by reference. By agreeing to these Terms, you also agree to our Privacy Policy available at getdochat.com/privacy.',
  },
  {
    title: '9. Service Availability & Disclaimer',
    body: `DO Chat is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.

We strive for high availability but do not guarantee uninterrupted or error-free service. We may perform maintenance that temporarily interrupts service and will make reasonable efforts to notify users in advance.

DO Chat is not responsible for any loss of data, messages, or files resulting from service interruptions, technical failures, or events beyond our reasonable control.`,
  },
  {
    title: '10. Limitation of Liability',
    body: `TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW:

DO CHAT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS INTERRUPTION, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.

OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL AMOUNT PAID BY YOU TO DO CHAT IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).`,
  },
  {
    title: '11. Termination',
    body: `Either party may terminate this agreement at any time.

You may delete your account at any time from your Profile settings. Deletion is permanent and irreversible.

We may suspend or terminate your account if you violate these Terms, with or without notice depending on the severity of the violation.

Upon termination, your right to access the Service ceases immediately. Sections 7, 10, 12, and 13 survive termination.`,
  },
  {
    title: '12. Governing Law & Dispute Resolution',
    body: `These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.

Any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved through binding individual arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. You and DO Chat waive the right to a jury trial and the right to participate in a class action lawsuit.

Either party may seek emergency injunctive relief from a court of competent jurisdiction in Delaware to prevent irreparable harm pending arbitration.

YOU AND DO CHAT AGREE THAT ANY CLAIMS MUST BE BROUGHT IN YOUR INDIVIDUAL CAPACITY AND NOT AS A CLASS OR REPRESENTATIVE ACTION.`,
  },
  {
    title: '13. Changes to These Terms',
    body: 'We may update these Terms from time to time. We will notify you of material changes via in-app notification at least 30 days before they take effect. Your continued use of the Service after changes take effect constitutes your acceptance of the revised Terms.',
  },
  {
    title: '14. Contact',
    body: `For questions or concerns about these Terms:

Legal: legal@getdochat.com
Support: support@getdochat.com
Privacy: privacy@getdochat.com

DO Chat Inc. — United States`,
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#0f172a] text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/landing" className="text-blue-400 text-sm hover:text-blue-300 transition-colors mb-6 inline-flex items-center gap-1.5">
            ← Back to DO Chat
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-lg shrink-0">📋</div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-gray-400 text-sm">Last updated: May 18, 2026 · Effective immediately</p>
          <p className="text-gray-300 text-sm mt-3 max-w-xl leading-relaxed">
            These Terms govern your use of DO Chat. Please read them carefully before creating an account or using the Service.
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
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
            <Link href="/landing" className="hover:text-gray-700 transition-colors">Home</Link>
          </div>
          <span>© 2026 DO Chat Inc. All rights reserved.</span>
        </div>
      </div>
    </div>
  )
}
