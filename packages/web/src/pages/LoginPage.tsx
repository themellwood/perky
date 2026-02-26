import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Navigate } from 'react-router-dom';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perky-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      await login(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf5]">
        <div className="max-w-md w-full card-brutal p-8 shadow-brutal-lg text-center">
          <div className="w-12 h-12 bg-fight-200 rounded-brutal border-3 border-ink flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-perky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-ink mb-2">Check your email</h2>
          <p className="text-gray-600">
            We sent a sign-in link to <strong>{email}</strong>. Click the link in the email to sign in.
          </p>
          <button
            onClick={() => { setSubmitted(false); setEmail(''); }}
            className="mt-6 text-sm font-bold text-ink hover:text-perky-700 underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf5]">
      <div className="max-w-md w-full card-brutal p-8 shadow-brutal-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink"><span className="bg-fight-500 px-2 py-0.5 border-2 border-ink rounded-[4px] inline-block -rotate-1">Perky</span></h1>
          <p className="text-gray-600 mt-1">Sign in to track your union benefits</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input-brutal w-full"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={sending || !email}
            className="btn-primary w-full"
          >
            {sending ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
      </div>
    </div>
  );
}
