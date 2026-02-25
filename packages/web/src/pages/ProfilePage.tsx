// packages/web/src/pages/ProfilePage.tsx
import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import type { UserAttributes } from '../hooks/useProfile';
import { useAuth } from '../lib/auth';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  casual: 'Casual',
  permanent: 'Permanent',
  fixed_term: 'Fixed-term',
};

export function ProfilePage() {
  const { user } = useAuth();
  const { data: attrs, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [startDate, setStartDate] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (attrs) {
      setStartDate(attrs.start_date ?? '');
      setEmploymentType(attrs.employment_type ?? '');
      setJobTitle(attrs.job_title ?? '');
    }
  }, [attrs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates: UserAttributes = {};
    if (startDate) updates.start_date = startDate;
    if (employmentType) updates.employment_type = employmentType as UserAttributes['employment_type'];
    if (jobTitle) updates.job_title = jobTitle;
    await updateProfile.mutateAsync(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto p-6">
          <div className="animate-pulse h-8 bg-gray-200 rounded w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="animate-pulse h-12 bg-gray-200 rounded" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-ink mb-2">My Profile</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Your details are used to check which benefits apply to you. All fields are optional.
        </p>

        <form onSubmit={handleSave} className="card-brutal p-6 space-y-5">
          {/* Account info (read-only) */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">Email</label>
            <p className="text-gray-600 text-sm">{user?.email}</p>
          </div>

          <hr className="border-ink/20" />

          {/* Start date */}
          <div>
            <label htmlFor="start_date" className="block text-sm font-semibold text-ink mb-1">
              Employment start date
            </label>
            <p className="text-xs text-gray-500 mb-2">Used to calculate your tenure for eligibility checks.</p>
            <input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-brutal w-full"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Employment type */}
          <div>
            <label htmlFor="employment_type" className="block text-sm font-semibold text-ink mb-1">
              Employment type
            </label>
            <select
              id="employment_type"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="input-brutal w-full"
            >
              <option value="">— Select —</option>
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Job title */}
          <div>
            <label htmlFor="job_title" className="block text-sm font-semibold text-ink mb-1">
              Job title / classification
            </label>
            <input
              id="job_title"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Nurse, Grade 3 Technician"
              className="input-brutal w-full"
              maxLength={200}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="btn-primary"
            >
              {updateProfile.isPending ? 'Saving…' : 'Save profile'}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">✓ Saved</span>
            )}
            {updateProfile.isError && (
              <span className="text-sm text-red-600">Failed to save. Try again.</span>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}
