import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { useJoinAgreement } from '../hooks/useMember';
import { useAuth } from '../lib/auth';

interface DirectoryAgreement {
  id: string;
  title: string;
  access_code: string;
  status: string;
  created_at: string;
  union_name: string;
  union_description: string | null;
  benefit_count: number;
}

function useDirectory() {
  return useQuery({
    queryKey: ['directory'],
    queryFn: () => api.get<{ data: DirectoryAgreement[] }>('/directory').then(r => r.data),
  });
}

const CATEGORY_ICONS: Record<string, string> = {
  leave: '🏖️',
  health: '🏥',
  financial: '💰',
  professional_development: '📚',
  workplace: '🏢',
  other: '📋',
};

export function DirectoryPage() {
  const { data: agreements, isLoading } = useDirectory();
  const { isAuthenticated } = useAuth();
  const joinMutation = useJoinAgreement();
  const navigate = useNavigate();
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<any>(null);

  const handleJoin = async (accessCode: string, title: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setError('');
    setJoining(accessCode);
    try {
      await joinMutation.mutateAsync(accessCode);
      setSuccess(`Joined "${title}" successfully!`);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setJoining(null);
    }
  };

  const toggleDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(id);
    try {
      const res = await api.get<{ data: any }>(`/directory/${id}`);
      setExpandedDetail(res.data);
    } catch {
      setExpandedDetail(null);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Public Directory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse verified collective agreements and join to track your benefits
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-perky-600 border-t-transparent" />
        </div>
      ) : !agreements || agreements.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">📂</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No public agreements yet</h2>
          <p className="text-gray-500">
            No collective agreements have been publicly listed. Use an access code to join privately.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {agreements.map((agreement) => (
            <div key={agreement.id} className="card-brutal overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{agreement.title}</h3>
                    <p className="text-sm text-perky-700 font-medium mt-0.5">{agreement.union_name}</p>
                    {agreement.union_description && (
                      <p className="text-sm text-gray-500 mt-1">{agreement.union_description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">
                        {agreement.benefit_count} benefit{agreement.benefit_count !== 1 ? 's' : ''}
                      </span>
                      <span className="badge-brutal bg-perky-200 text-perky-900">
                        Verified
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleDetail(agreement.id)}
                      className="btn-secondary btn-sm"
                    >
                      {expandedId === agreement.id ? 'Hide' : 'Preview'}
                    </button>
                    <button
                      onClick={() => handleJoin(agreement.access_code, agreement.title)}
                      disabled={joining === agreement.access_code}
                      className="btn-primary btn-sm disabled:opacity-50"
                    >
                      {joining === agreement.access_code ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === agreement.id && expandedDetail && (
                <div className="border-t-3 border-ink bg-gray-50 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Benefits Included:</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {expandedDetail.benefits?.map((b: any) => (
                      <div key={b.id} className="flex items-start gap-2 text-sm">
                        <span>{CATEGORY_ICONS[b.category] || '📋'}</span>
                        <div>
                          <span className="font-medium text-gray-800">{b.name}</span>
                          {b.limit_amount !== null && (
                            <span className="text-gray-500 ml-1">
                              ({b.limit_amount} {b.unit_type}/{b.period.replace('per_', '')})
                            </span>
                          )}
                          {b.description && (
                            <p className="text-xs text-gray-400">{b.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 card-brutal bg-red-50 text-red-700 px-4 py-2 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 card-brutal bg-green-50 text-green-700 px-4 py-2 text-sm">
          {success}
        </div>
      )}
    </Layout>
  );
}
