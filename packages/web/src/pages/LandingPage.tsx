import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';

const faqItems = [
  { q: 'Is my contract data safe?', a: 'Absolutely. Your documents are encrypted and processed securely. We never share your data with employers or third parties. You own your data.' },
  { q: 'What if I\'m not in a union?', a: 'Perky works with any employment contract or agreement. Upload your individual contract and we\'ll extract your benefits the same way.' },
  { q: 'Is this really free?', a: 'Yes. Perky is free forever for individual employees. We believe everyone deserves to know what they\'re entitled to.' },
  { q: 'How does AI extraction work?', a: 'Our AI reads your entire contract and identifies every benefit, allowance, and entitlement. It translates legalese into plain English so you know exactly what you can claim.' },
  { q: 'Can my employer see my usage?', a: 'No. Your account is completely private. Your employer has zero visibility into whether you use Perky or what benefits you track.' },
];

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#fafaf5]">
      {/* Section 1: Nav */}
      <PublicNav />

      {/* Section 2: Hero */}
      <section className="bg-[#fafaf5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-ink/60 mb-4">Wake Up Call</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-ink leading-tight mb-6">
            THEY&apos;RE HIDING{' '}
            <span className="bg-fight-500 px-2 py-0.5 border-2 border-ink rounded-[4px] inline-block -rotate-1">
              YOUR MONEY
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-ink/70 max-w-2xl mx-auto mb-8">
            Your employment contract has benefits worth thousands &mdash; buried in legalese nobody reads. Perky uses AI to extract every cent you&apos;re owed. NZ union agreements pre-loaded.
          </p>
          <Link to="/login" className="btn-accent text-lg px-8 py-3.5 inline-block">
            EXPOSE YOUR BENEFITS
          </Link>
          <p className="text-sm text-ink/50 mt-4 font-medium">Free Forever. No Credit Card.</p>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section className="bg-white border-y-3 border-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink text-center mb-12">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="card-brutal p-6 text-center">
              <div className="w-10 h-10 bg-fight-500 rounded-full border-3 border-ink flex items-center justify-center font-bold text-ink mx-auto mb-4">
                1
              </div>
              <svg className="w-10 h-10 mx-auto mb-3 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="font-bold text-ink text-lg mb-2">Upload Your Contract</h3>
              <p className="text-sm text-ink/60">Drop in your employment contract or select your union agreement.</p>
            </div>

            {/* Step 2 */}
            <div className="card-brutal p-6 text-center">
              <div className="w-10 h-10 bg-fight-500 rounded-full border-3 border-ink flex items-center justify-center font-bold text-ink mx-auto mb-4">
                2
              </div>
              <svg className="w-10 h-10 mx-auto mb-3 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <h3 className="font-bold text-ink text-lg mb-2">AI Reads Every Page</h3>
              <p className="text-sm text-ink/60">Our AI scans every clause and extracts every benefit in seconds.</p>
            </div>

            {/* Step 3 */}
            <div className="card-brutal p-6 text-center">
              <div className="w-10 h-10 bg-fight-500 rounded-full border-3 border-ink flex items-center justify-center font-bold text-ink mx-auto mb-4">
                3
              </div>
              <svg className="w-10 h-10 mx-auto mb-3 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-bold text-ink text-lg mb-2">Start Claiming</h3>
              <p className="text-sm text-ink/60">See your benefits in plain English and start using what&apos;s yours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: The Scam They're Running */}
      <section className="bg-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">THE SCAM THEY&apos;RE RUNNING</h2>
          <p className="text-center text-white/60 mb-12 max-w-2xl mx-auto">
            Billions in employee benefits go unclaimed every year. That&apos;s not an accident.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-3 border-white rounded-brutal p-6">
              <h3 className="font-bold text-white text-lg mb-3">BURIED IN LEGALESE</h3>
              <p className="text-sm text-white/70">
                They bury your $2,000 wellness allowance on page 34, paragraph 7, subsection C. You&apos;ll never find it. That&apos;s the point.
              </p>
            </div>
            <div className="border-3 border-white rounded-brutal p-6">
              <h3 className="font-bold text-white text-lg mb-3">NEVER MENTIONED</h3>
              <p className="text-sm text-white/70">
                HR &apos;forgot&apos; to tell you about the gym membership reimbursement. And the childcare benefit. And the mental health budget. Oops.
              </p>
            </div>
            <div className="border-3 border-white rounded-brutal p-6">
              <h3 className="font-bold text-white text-lg mb-3">EXPIRES UNUSED</h3>
              <p className="text-sm text-white/70">
                Use it or lose it. They&apos;re COUNTING on you losing it. That&apos;s free money back in their pocket. YOUR money.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Perky Exposes Everything */}
      <section className="bg-[#fafaf5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-perky-700 text-center mb-4">PERKY EXPOSES EVERYTHING</h2>
          <p className="text-center text-ink/60 mb-12 max-w-2xl mx-auto">
            Upload your contract. We&apos;ll extract every benefit they don&apos;t want you to know about.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="card-brutal p-6">
              <h3 className="font-bold text-ink text-lg mb-3">AI-POWERED EXTRACTION</h3>
              <p className="text-sm text-ink/60">
                Our AI reads your 50-page contract in seconds. Every benefit. Every allowance. Every reimbursement. Laid out in plain English.
              </p>
            </div>
            <div className="card-brutal p-6">
              <h3 className="font-bold text-ink text-lg mb-3">TRACK WHAT YOU&apos;VE CLAIMED</h3>
              <p className="text-sm text-ink/60">
                See exactly how much you&apos;ve used and how much is left. Set reminders before benefits expire. Never leave money on the table again.
              </p>
            </div>
            <div className="card-brutal p-6">
              <h3 className="font-bold text-ink text-lg mb-3">SEE WHAT OTHERS CLAIM</h3>
              <p className="text-sm text-ink/60">
                247 people with your same contract just claimed their wellness budget. You should too. Safety in numbers.
              </p>
            </div>
            <div className="card-brutal p-6">
              <h3 className="font-bold text-ink text-lg mb-3">EXACT CONTRACT WORDING</h3>
              <p className="text-sm text-ink/60">
                We show you the EXACT clause from your contract. Walk into HR with receipts. They can&apos;t say no to their own words.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: NZ Union Callout */}
      <section className="bg-fight-100 border-y-3 border-ink">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink mb-6">ALL NZ UNION AGREEMENTS LOADED</h2>
          <p className="text-lg text-ink/70 mb-8 max-w-2xl mx-auto">
            In a union? Don&apos;t waste time uploading. We&apos;ve already loaded every major NZ union agreement. Just select yours and start claiming. Your union fought for these benefits &mdash; USE THEM.
          </p>
          <Link to="/login" className="btn-primary text-lg px-8 py-3 inline-block">
            GET STARTED
          </Link>
        </div>
      </section>

      {/* Section 7: Stats */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink text-center mb-12">THE NUMBERS DON&apos;T LIE</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-brutal p-8 text-center">
              <p className="text-5xl font-bold text-perky-500 mb-2">$4,000</p>
              <p className="text-sm text-ink/60 font-medium">Average unclaimed per employee</p>
            </div>
            <div className="card-brutal p-8 text-center">
              <p className="text-5xl font-bold text-fight-600 mb-2">68%</p>
              <p className="text-sm text-ink/60 font-medium">Of benefits never get used</p>
            </div>
            <div className="card-brutal p-8 text-center">
              <p className="text-5xl font-bold text-perky-500 mb-2">$50B</p>
              <p className="text-sm text-ink/60 font-medium">Left unclaimed annually</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 8: Union Partnership */}
      <section className="bg-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12">UNIONS: ARM YOUR MEMBERS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-3 border-white rounded-brutal p-6 text-left">
              <h3 className="font-bold text-white text-lg mb-3">Pre-Load Agreements</h3>
              <p className="text-sm text-white/70">
                Upload your collective agreement once. Every member gets instant access to their benefits.
              </p>
            </div>
            <div className="border-3 border-white rounded-brutal p-6 text-left">
              <h3 className="font-bold text-white text-lg mb-3">Real-Time Analytics</h3>
              <p className="text-sm text-white/70">
                See which benefits your members are claiming &mdash; and which are going unclaimed.
              </p>
            </div>
            <div className="border-3 border-white rounded-brutal p-6 text-left">
              <h3 className="font-bold text-white text-lg mb-3">Strengthen Bargaining</h3>
              <p className="text-sm text-white/70">
                Use real usage data to prove which benefits matter most at the negotiating table.
              </p>
            </div>
          </div>
          <Link to="/partners" className="btn-accent text-lg px-8 py-3 inline-block mt-8">
            Partner With Us
          </Link>
        </div>
      </section>

      {/* Section 9: Social Proof */}
      <section className="bg-[#fafaf5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <p className="text-lg font-medium text-ink/60 mb-8">Trusted by union members across New Zealand</p>
          <div className="flex flex-wrap justify-center gap-6">
            <div className="w-24 h-12 bg-white border-3 border-ink rounded-brutal flex items-center justify-center text-xs text-ink/40 font-medium">
              Logo
            </div>
            <div className="w-24 h-12 bg-white border-3 border-ink rounded-brutal flex items-center justify-center text-xs text-ink/40 font-medium">
              Logo
            </div>
            <div className="w-24 h-12 bg-white border-3 border-ink rounded-brutal flex items-center justify-center text-xs text-ink/40 font-medium">
              Logo
            </div>
            <div className="w-24 h-12 bg-white border-3 border-ink rounded-brutal flex items-center justify-center text-xs text-ink/40 font-medium">
              Logo
            </div>
          </div>
        </div>
      </section>

      {/* Section 10: FAQ */}
      <section className="bg-white border-t-3 border-ink">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink text-center mb-12">QUESTIONS?</h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div key={i} className="card-brutal">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex justify-between items-center p-5 text-left"
                >
                  <span className="font-bold text-ink pr-4">{item.q}</span>
                  <svg
                    className={`w-5 h-5 text-ink flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-ink/70 border-t-2 border-ink/10 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 11: Final CTA */}
      <section className="bg-ink">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">STOP GETTING ROBBED</h2>
          <p className="text-lg text-white/60 mb-8 max-w-xl mx-auto">
            Your contract is a legally binding document. Make them honor it.
          </p>
          <Link to="/login" className="btn-accent text-lg px-8 py-3.5 inline-block">
            GET WHAT&apos;S YOURS
          </Link>
          <p className="text-sm text-white/40 mt-4 font-medium">
            Join thousands of employees taking back what they&apos;re owed
          </p>
        </div>
      </section>

      {/* Section 12: Footer */}
      <PublicFooter />
    </div>
  );
}
