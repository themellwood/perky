import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useUnion, useUnionMembers, useAssignAdmin } from '../../hooks/useUnions';
import { useAgreements, useCreateAgreement } from '../../hooks/useAgreements';

export function UnionDetailPage() {
  const { unionId } = useParams<{ unionId: string }>();
  const { data: union } = useUnion(unionId!);
  const { data: members } = useUnionMembers(unionId!);
  const { data: agreements } = useAgreements(unionId!);
  const createAgreement = useCreateAgreement();
  const assignAdmin = useAssignAdmin();

  const [showNewAgreement, setShowNewAgreement] = useState(false);
  const [title, setTitle] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAgreement.mutateAsync({ unionId: unionId!, title });
    setTitle('');
    setShowNewAgreement(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    await assignAdmin.mutateAsync({ unionId: unionId!, email: adminEmail });
    setAdminEmail('');
  };

  if (!union) return <Layout><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perky-600" /></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/admin" className="text-sm font-bold text-ink hover:text-perky-700">&larr; Back to admin</Link>
        <div className="flex justify-between items-center mt-2">
          <h1 className="text-2xl font-bold text-ink">{(union as any).name}</h1>
          <Link
            to={`/admin/unions/${unionId}/analytics`}
            className="btn-secondary text-sm"
          >
            📊 Analytics
          </Link>
        </div>
        {(union as any).description && <p className="text-gray-600 mt-1">{(union as any).description}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-ink">Collective Agreements</h2>
            <button
              onClick={() => setShowNewAgreement(!showNewAgreement)}
              className="btn-primary btn-sm"
            >
              New Agreement
            </button>
          </div>

          {showNewAgreement && (
            <form onSubmit={handleCreateAgreement} className="card-brutal p-4 mb-4 flex gap-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Agreement title..."
                required
                className="input-brutal flex-1"
              />
              <button type="submit" disabled={createAgreement.isPending} className="btn-primary disabled:opacity-50">
                Create
              </button>
            </form>
          )}

          {agreements?.length === 0 ? (
            <p className="text-gray-500">No agreements yet.</p>
          ) : (
            <div className="space-y-3">
              {agreements?.map((a: any) => (
                <Link
                  key={a.id}
                  to={`/admin/agreements/${a.id}`}
                  className="block card-brutal p-4 hover:shadow-brutal-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-ink">{a.title}</h3>
                      {a.access_code && <p className="text-xs text-gray-500 mt-1 font-mono">Code: {a.access_code}</p>}
                    </div>
                    <span className={`badge-brutal text-xs ${
                      a.status === 'published' ? 'bg-perky-200' :
                      a.status === 'public_approved' ? 'bg-fight-200' :
                      'bg-gray-200'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold text-ink mb-4">Admins</h2>
          <form onSubmit={handleAddAdmin} className="flex gap-2 mb-4">
            <input
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="admin@email.com"
              required
              className="input-brutal flex-1 text-sm"
            />
            <button type="submit" className="btn-primary btn-sm">Add</button>
          </form>
          <div className="space-y-2">
            {members?.filter((m: any) => m.union_role === 'admin').map((m: any) => (
              <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-medium">{m.email}</p>
                <p className="text-xs text-gray-500">{m.name || 'No name set'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
