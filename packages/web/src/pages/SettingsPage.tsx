import { useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api-client';

export function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setMessage(null);
    try {
      await api.put('/auth/me', { name: name.trim() });
      setMessage({ type: 'success', text: 'Profile updated!' });
      // Reload to update the nav header name
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Profile section */}
      <div className="card-brutal p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="input-brutal w-full px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="input-brutal w-full px-3 py-2 text-sm bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <span className="badge-brutal text-xs px-2 py-1 bg-perky-100 text-perky-800">
              {user?.role.replace(/_/g, ' ')}
            </span>
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card-brutal p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Delete Account</p>
            <p className="text-xs text-gray-500">Permanently remove your account and all data.</p>
          </div>
          <button
            disabled
            className="btn-danger btn-sm opacity-50 cursor-not-allowed"
          >
            Delete Account
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Coming soon</p>
      </div>
    </Layout>
  );
}
