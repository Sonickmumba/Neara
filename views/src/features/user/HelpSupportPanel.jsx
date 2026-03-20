import { useState } from 'react';
import { ArrowLeft, ChevronDown, Mail, FileText, Shield } from 'lucide-react';

const FAQS = [
  {
    id: 'faq-1',
    question: 'How do I list an item for trade?',
    answer:
      'Tap the "+" button on the home feed, fill in your item details, add photos, and publish. Your listing will appear to neighbours in your area immediately.',
  },
  {
    id: 'faq-2',
    question: 'How does the trade process work?',
    answer:
      'Browse items, find something you want, and send a trade offer to the owner. You can propose one of your own items in exchange or arrange a direct swap. If both parties accept, you coordinate pickup through the in-app chat.',
  },
  {
    id: 'faq-3',
    question: 'Is my personal information shared with other users?',
    answer:
      'Only your display name and general neighbourhood are visible to others. Your exact address, email, and phone number are never shared publicly.',
  },
  {
    id: 'faq-4',
    question: 'What should I do if a trade goes wrong?',
    answer:
      'If you encounter a problem with a trade or another user, use the "Report" option on their profile or listing. Our team reviews all reports and takes appropriate action.',
  },
  {
    id: 'faq-5',
    question: 'How do I delete my account?',
    answer:
      'Go to Settings → Danger Zone → Delete Account. This action permanently removes all your data and cannot be undone.',
  },
  {
    id: 'faq-6',
    question: 'Can I change my neighbourhood?',
    answer:
      'Yes. Go to Settings → Profile and update your location. Allow location access so we can pin your neighbourhood accurately.',
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-gray-600 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export function HelpSupportPanel({ onBack }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white">
        <button
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="font-semibold text-gray-900 text-lg">
          Help &amp; Support
        </h2>
      </div>

      <div className="px-6 py-8 max-w-md mx-auto space-y-6">
        {/* FAQ accordion */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Frequently Asked Questions
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {FAQS.map((faq) => (
              <FaqItem
                key={faq.id}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </section>

        {/* Contact */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Contact Us
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <a
              href="mailto:support@neara.app"
              className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Email Support</div>
                <div className="text-sm text-gray-500">support@neara.app</div>
              </div>
            </a>
          </div>
        </section>

        {/* Legal */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Legal
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            <button
              type="button"
              onClick={() => {}}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div className="font-medium text-gray-900">Terms of Service</div>
            </button>
            <button
              type="button"
              onClick={() => {}}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div className="font-medium text-gray-900">Privacy Policy</div>
            </button>
          </div>
        </section>

        <p className="text-center text-xs text-gray-400 pb-4">
          Neara v1.0.0 — Built with ❤️ for your neighbourhood
        </p>
      </div>
    </div>
  );
}
