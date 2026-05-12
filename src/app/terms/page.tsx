import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — DO Chat',
  description: 'DO Chat Terms of Service. Read the rules and conditions for using our platform.',
}

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or using DO Chat (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service. These Terms constitute a legally binding agreement between you and DO Chat, a company registered in the United States.',
  },
  {
    title: '2. Description of Service',
    body: 'DO Chat is a messaging platform that enables users to:\n• Send and receive end-to-end encrypted text messages and files\n• Make voice and video calls\n• Use AI-powered features (DO AI) for message assistance and automation\n• Organize tasks and projects within chat rooms\n\nThe Service is available as a Progressive Web App (PWA) accessible from any modern browser.',
  },
  {
    title: '3. Account Registration',
    body: 'To use DO Chat you must:\n• Be at least 13 years old (or 16 in the EU/EEA)\n• Provide accurate registration information\n• Keep your login credentials confidential\n• Notify us immediately of any unauthorized access at security@getdochat.com\n\nYou are responsible for all activity that occurs under your account.',
  },
  {
    title: '4. Subscription Plans & Payments',
    body: 'DO Chat offers a free tier and paid subscription plans (Pro and Business). Paid plans are billed monthly or annually in advance.\n\n• All payments are processed securely by Stripe\n• Prices are listed in USD and are subject to change with 30 days notice\n• Subscriptions auto-renew unless cancelled before the renewal date\n• You may cancel your subscription at any time from your Profile settings; access continues until the end of the billing period\n• Refunds are available within 7 days of initial purchase if you have not substantially used the paid features\n\nDO Chat reserves the right to modify pricing with at least 30 days advance notice to existing subscribers.',
  },
  {
    title: '5. Acceptable Use',
    body: 'You agree not to use DO Chat to:\n• Violate any applicable local, state, national, or international law\n• Send spam, phishing messages, or unsolicited bulk communications\n• Distribute malware, viruses, or harmful code\n• Harass, threaten, or abuse other users\n• Infringe on the intellectual property rights of others\n• Attempt to gain unauthorized access to other accounts or systems\n• Reverse engineer, decompile, or disassemble any part of the Service\n• Use automated tools to scrape, mine, or extract data from the Service\n\nViolation of these rules may result in immediate account termination without refund.',
  },
  {
    title: '6. AI Features (DO AI)',
    body: 'DO Chat includes AI-powered features powered by Anthropic\'s Claude API. By using these features:\n• You understand that AI-generated content may be inaccurate or incomplete\n• You must not use AI features to generate illegal, harmful, or deceptive content\n• Messages processed by AI features are subject to Anthropic\'s usage policies\n• DO Chat is not liable for decisions made based on AI-generated suggestions\n\nAI features are subject to usage limits based on your subscription plan.',
  },
  {
    title: '7. Content Ownership & License',
    body: 'You retain full ownership of all content you create and share on DO Chat (messages, files, etc.).\n\nBy using the Service, you grant DO Chat a limited, non-exclusive license to process and transmit your content solely for the purpose of operating the Service. We do not access, read, or use your encrypted messages for any other purpose.\n\nDO Chat owns all rights to the platform, its design, branding, and features.',
  },
  {
    title: '8. Privacy',
    body: 'Your use of DO Chat is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By agreeing to these Terms, you also agree to our Privacy Policy.',
  },
  {
    title: '9. Service Availability',
    body: 'We strive to provide a reliable service but cannot guarantee 100% uptime. The Service is provided "as is" and "as available". We may perform maintenance that temporarily interrupts service, and we will make reasonable efforts to notify users in advance.\n\nDO Chat is not liable for any losses resulting from service interruptions, data loss, or technical failures beyond our reasonable control.',
  },
  {
    title: '10. Termination',
    body: 'Either party may terminate this agreement at any time.\n\n• You may delete your account at any time from your Profile settings\n• We may suspend or terminate accounts that violate these Terms, with or without notice depending on severity\n• Upon termination, your right to use the Service ceases immediately\n• Provisions that by their nature should survive termination (including ownership clauses, disclaimers, and limitations of liability) will remain in effect',
  },
  {
    title: '11. Disclaimers & Limitation of Liability',
    body: 'TO THE FULLEST EXTENT PERMITTED BY LAW, DO CHAT IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED.\n\nIN NO EVENT SHALL DO CHAT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.\n\nOUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO DO CHAT IN THE 12 MONTHS PRECEDING THE CLAIM.',
  },
  {
    title: '12. Governing Law & Dispute Resolution',
    body: 'These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions.\n\nAny disputes arising from these Terms or your use of the Service will be resolved through binding arbitration in accordance with the American Arbitration Association (AAA) rules, except that either party may seek injunctive relief in a court of competent jurisdiction.\n\nFor users in the EU/EEA: Nothing in these Terms affects your rights under applicable EU consumer protection laws.',
  },
  {
    title: '13. Changes to These Terms',
    body: 'We may update these Terms from time to time. We will notify you of material changes via in-app notification at least 30 days before they take effect. Your continued use of the Service after changes constitutes your acceptance of the new Terms.',
  },
  {
    title: '14. Contact',
    body: 'For questions about these Terms:\n• Email: legal@getdochat.com\n• General support: support@getdochat.com',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/landing" className="text-blue-400 text-sm hover:text-blue-300 transition-colors mb-8 inline-block">← Back</Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
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
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
          <Link href="/landing" className="hover:text-gray-300 transition-colors">Home</Link>
          <span>© 2026 DO Chat</span>
        </div>
      </div>
    </div>
  )
}
