import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useJoinAgreement } from '../hooks/useMember';

export function JoinPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const joinMutation = useJoinAgreement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Access code must be 6 characters');
      return;
    }

    try {
      const agreement = await joinMutation.mutateAsync(trimmed);
      setSuccess(`Joined "${agreement.title}" successfully!`);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Join an Agreement</h1>
        <p className="text-gray-600 mb-6">
          Enter the 6-character access code provided by your union to access your collective agreement benefits.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="e.g. YDYTCW"
              maxLength={6}
              className="input-brutal w-full text-center text-2xl font-mono tracking-[0.5em] uppercase"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-200 text-ink px-4 py-2 rounded-brutal border-3 border-ink text-sm">{error}</div>
          )}

          {success && (
            <div className="bg-perky-200 text-ink px-4 py-2 rounded-brutal border-3 border-ink text-sm">{success}</div>
          )}

          <button
            type="submit"
            disabled={joinMutation.isPending || code.length !== 6}
            className="btn-accent w-full py-3 text-lg"
          >
            {joinMutation.isPending ? 'Joining...' : 'Join Agreement'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
