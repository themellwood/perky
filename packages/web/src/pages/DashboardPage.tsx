import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { BenefitDashboardCard } from '../components/BenefitDashboardCard';
import { useMemberAgreements } from '../hooks/useMember';
import { useUsageSummary, type UsageSummary } from '../hooks/useUsage';

const CATEGORY_ORDER = ['leave', 'health', 'financial', 'pay', 'professional_development', 'workplace', 'protection', 'process', 'other'];

function groupByAgreement(summaries: UsageSummary[]): Record<string, UsageSummary[]> {
  const groups: Record<string, UsageSummary[]> = {};
  for (const s of summaries) {
    const key = s.agreement_title;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return groups;
}

function groupByCategory(summaries: UsageSummary[]): Record<string, UsageSummary[]> {
  const groups: Record<string, UsageSummary[]> = {};
  for (const s of summaries) {
    const key = s.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  // Sort by category order
  const sorted: Record<string, UsageSummary[]> = {};
  for (const cat of CATEGORY_ORDER) {
    if (groups[cat]) sorted[cat] = groups[cat];
  }
  return sorted;
}

type GroupMode = 'agreement' | 'category';

export function DashboardPage() {
  const { data: agreements, isLoading: loadingAgreements } = useMemberAgreements();
  const { data: summaries, isLoading: loadingSummaries } = useUsageSummary();
  const [groupMode, setGroupMode] = useState<GroupMode>('agreement');

  const isLoading = loadingAgreements || loadingSummaries;
  const hasAgreements = agreements && agreements.length > 0;
  const hasBenefits = summaries && summaries.length > 0;

  const hasIncompleteEligibility = summaries?.some((s) => s.eligible === 'unknown') ?? false;

  const groups = hasBenefits
    ? groupMode === 'agreement'
      ? groupByAgreement(summaries)
      : groupByCategory(summaries)
    : {};

  const categoryLabels: Record<string, string> = {
    leave: 'Leave',
    health: 'Health',
    financial: 'Financial',
    pay: 'Pay & Allowances',
    professional_development: 'Professional Development',
    workplace: 'Workplace',
    protection: 'Protections',
    process: 'Processes & Rights',
    other: 'Other',
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Benefits</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage your union benefit usage
          </p>
        </div>
        <Link
          to="/join"
          className="btn-accent text-sm"
        >
          + Join Agreement
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-perky-600 border-t-transparent" />
        </div>
      ) : !hasAgreements ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No agreements yet</h2>
          <p className="text-gray-500 mb-6">
            Join a collective agreement using an access code from your union,
            or upload your own agreement if your union isn't on Perky yet.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/join"
              className="btn-accent inline-block"
            >
              Enter Access Code
            </Link>
            <Link
              to="/my-agreements"
              className="btn-secondary inline-block"
            >
              Upload My Agreement
            </Link>
          </div>
        </div>
      ) : !hasBenefits ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">You've joined an agreement!</h2>
          <p className="text-gray-500">
            Benefits are being set up. Check back soon!
          </p>
        </div>
      ) : (
        <>
          {hasIncompleteEligibility && (
            <div className="mb-6 flex items-center gap-3 border-3 border-amber-400 bg-amber-50 rounded-brutal p-4 shadow-brutal">
              <span className="text-amber-500 text-lg">⚠️</span>
              <p className="text-sm text-amber-800 flex-1">
                Some benefits have eligibility requirements.{' '}
                <Link to="/profile" className="font-semibold underline hover:no-underline">
                  Complete your profile →
                </Link>{' '}
                to see which apply to you.
              </p>
            </div>
          )}

          {/* Group toggle */}
          <div className="flex gap-1 mb-6 border-3 border-ink rounded-brutal p-1 bg-white w-fit">
            <button
              onClick={() => setGroupMode('agreement')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                groupMode === 'agreement'
                  ? 'bg-ink text-white font-bold rounded-[4px]'
                  : 'text-ink font-medium hover:bg-gray-100 rounded-[4px]'
              }`}
            >
              By Agreement
            </button>
            <button
              onClick={() => setGroupMode('category')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                groupMode === 'category'
                  ? 'bg-ink text-white font-bold rounded-[4px]'
                  : 'text-ink font-medium hover:bg-gray-100 rounded-[4px]'
              }`}
            >
              By Category
            </button>
          </div>

          {/* Benefit groups */}
          <div className="space-y-8">
            {Object.entries(groups).map(([groupKey, benefits]) => (
              <div key={groupKey}>
                <h2 className="text-lg font-bold text-ink mb-3">
                  {groupMode === 'category' ? categoryLabels[groupKey] || groupKey : groupKey}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {benefits.map((summary) => (
                    <BenefitDashboardCard key={summary.benefit_id} summary={summary} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
