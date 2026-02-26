import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import { api } from '../lib/api-client';

export function PartnersPage() {
  const [form, setForm] = useState({ name: '', unionName: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await api.post('/partners/enquiry', form);
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Section 1: Nav */}
      <PublicNav />

      {/* Section 2: Hero */}
      <section className="bg-[#fafaf5] py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-ink mb-6">
            Partner With Perky
          </h1>
          <p className="text-lg sm:text-xl text-ink/70 max-w-2xl mx-auto">
            Empower your members to claim every benefit they&apos;re entitled to.
            Pre-load your collective agreement and give your members instant access.
          </p>
        </div>
      </section>

      {/* Section 3: How It Works for Unions */}
      <section className="bg-white border-y-3 border-ink py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="card-brutal p-6">
              <div className="w-10 h-10 bg-fight-200 border-3 border-ink rounded-brutal flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-ink">1</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">Upload Your Agreement</h3>
              <p className="text-ink/70 text-sm">
                Share your collective agreement once. Our AI extracts every benefit automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card-brutal p-6">
              <div className="w-10 h-10 bg-fight-200 border-3 border-ink rounded-brutal flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-ink">2</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">Members Get Instant Access</h3>
              <p className="text-ink/70 text-sm">
                Your members sign up and immediately see all their benefits in plain English.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card-brutal p-6">
              <div className="w-10 h-10 bg-fight-200 border-3 border-ink rounded-brutal flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-ink">3</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">Track &amp; Analyse</h3>
              <p className="text-ink/70 text-sm">
                Real-time dashboard shows which benefits members are claiming and which are going unused.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Why Partner */}
      <section className="bg-[#fafaf5] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-12">
            Why Unions Choose Perky
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 */}
            <div className="card-brutal p-6">
              <div className="w-10 h-10 bg-perky-200 border-3 border-ink rounded-brutal flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">Increase Member Engagement</h3>
              <p className="text-ink/70 text-sm">
                Members who know their benefits use their benefits. Drive real value from the agreements you fought for.
              </p>
            </div>

            {/* Card 2 */}
            <div className="card-brutal p-6">
              <div className="w-10 h-10 bg-perky-200 border-3 border-ink rounded-brutal flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">Strengthen Bargaining</h3>
              <p className="text-ink/70 text-sm">
                Aggregate usage data shows which benefits matter most. Walk into negotiations with evidence, not anecdotes.
              </p>
            </div>

            {/* Card 3 */}
            <div className="card-brutal p-6">
              <div className="w-10 h-10 bg-perky-200 border-3 border-ink rounded-brutal flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">Track Utilization</h3>
              <p className="text-ink/70 text-sm">
                See real-time data on which benefits are being claimed across your membership. Identify gaps and opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Contact Form */}
      <section className="bg-white border-t-3 border-ink">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-10">
            Get In Touch
          </h2>

          {status === 'sent' ? (
            <div className="card-brutal p-8 text-center">
              <svg
                className="w-12 h-12 text-perky-600 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-ink mb-2">Message Sent!</h3>
              <p className="text-ink/70">
                Thanks for reaching out. We&apos;ll be in touch shortly.
              </p>
              <Link to="/" className="btn-secondary inline-block mt-6">
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="partner-name" className="block text-sm font-medium text-ink mb-1">
                  Name
                </label>
                <input
                  id="partner-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  className="input-brutal w-full"
                />
              </div>

              <div>
                <label htmlFor="partner-union" className="block text-sm font-medium text-ink mb-1">
                  Union Name
                </label>
                <input
                  id="partner-union"
                  type="text"
                  required
                  value={form.unionName}
                  onChange={(e) => setForm({ ...form, unionName: e.target.value })}
                  placeholder="Your union or organisation"
                  className="input-brutal w-full"
                />
              </div>

              <div>
                <label htmlFor="partner-email" className="block text-sm font-medium text-ink mb-1">
                  Email
                </label>
                <input
                  id="partner-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@union.org"
                  className="input-brutal w-full"
                />
              </div>

              <div>
                <label htmlFor="partner-message" className="block text-sm font-medium text-ink mb-1">
                  Message
                </label>
                <textarea
                  id="partner-message"
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us about your union and what you&apos;re looking for..."
                  className="input-brutal w-full resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="btn-accent w-full"
              >
                {status === 'sending' ? 'Sending...' : 'Send Enquiry'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Section 6: Footer */}
      <PublicFooter />
    </div>
  );
}
