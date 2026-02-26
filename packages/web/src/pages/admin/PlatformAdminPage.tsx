import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useUnions, useCreateUnion, useAssignAdmin } from '../../hooks/useUnions';

export function PlatformAdminPage() {
  const { data: unions, isLoading } = useUnions();
  const createUnion = useCreateUnion();
  const assignAdmin = useAssignAdmin();

  const [showCreate, setShowCreate] = useState(false);
  const [unionName, setUnionName] = useState('');
  const [unionDesc, setUnionDesc] = useState('');

  const [assignUnionId, setAssignUnionId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [assignMsg, setAssignMsg] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUnion.mutateAsync({ name: unionName, description: unionDesc || undefined });
    setUnionName('');
    setUnionDesc('');
    setShowCreate(false);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignAdmin.mutateAsync({ unionId: assignUnionId, email: adminEmail });
      setAssignMsg(`${adminEmail} assigned as admin`);
      setAdminEmail('');
      setAssignUnionId('');
    } catch (err) {
      setAssignMsg(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-ink">Platform Admin</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-accent"
        >
          Create Union
        </button>
      </div>

      {showCreate && (
        <div className="card-brutal p-6 mb-6">
          <h2 className="text-lg font-bold text-ink mb-4">New Union</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={unionName}
                onChange={e => setUnionName(e.target.value)}
                required
                className="input-brutal w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={unionDesc}
                onChange={e => setUnionDesc(e.target.value)}
                rows={2}
                className="input-brutal w-full"
              />
            </div>
            <button type="submit" disabled={createUnion.isPending} className="btn-primary disabled:opacity-50">
              {createUnion.isPending ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
      )}

      <div className="card-brutal p-6 mb-6">
        <h2 className="text-lg font-bold text-ink mb-4">Assign Union Admin</h2>
        <form onSubmit={handleAssign} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Union</label>
            <select
              value={assignUnionId}
              onChange={e => setAssignUnionId(e.target.value)}
              required
              className="select-brutal w-full"
            >
              <option value="">Select union...</option>
              {unions?.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              required
              className="input-brutal w-full"
            />
          </div>
          <button type="submit" disabled={assignAdmin.isPending} className="btn-primary disabled:opacity-50 whitespace-nowrap">
            Assign
          </button>
        </form>
        {assignMsg && <p className="mt-2 text-sm text-perky-700">{assignMsg}</p>}
      </div>

      <h2 className="text-lg font-bold text-ink mb-4">Unions</h2>
      {isLoading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perky-600" />
      ) : unions?.length === 0 ? (
        <p className="text-gray-500">No unions yet. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {unions?.map((union: any) => (
            <Link
              key={union.id}
              to={`/admin/unions/${union.id}`}
              className="block card-brutal p-4 hover:shadow-brutal-md hover:-translate-y-0.5 transition-all"
            >
              <h3 className="font-bold text-ink">{union.name}</h3>
              {union.description && <p className="text-sm text-gray-600 mt-1">{union.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
