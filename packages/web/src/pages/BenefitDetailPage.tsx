import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useBenefit } from '../hooks/useBenefits';
import { useUsageSummary } from '../hooks/useUsage';
import { LogUsageModal } from '../components/LogUsageModal';
import { UsageHistory } from '../components/UsageHistory';

const CATEGORY_ICONS: Record<string, string> = {
  leave: '🏖️', health: '🏥', financial: '💰', pay: '💵',
  professional_development: '📚', workplace: '🏢',
  protection: '🛡️', process: '⚖️', other: '📋',
};

const PERIOD_LABELS: Record<string, string> = {
  per_month: 'per month', per_year: 'per year',
  per_occurrence: 'per occurrence', unlimited: 'unlimited',
};

export function BenefitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: benefit, isLoading: loadingBenefit } = useBenefit(id!);
  const { data: summaries } = useUsageSummary();
  const [showLogModal, setShowLogModal] = useState(false);

  // Find usage data for this benefit from the summary
  const usage = summaries?.find(s => s.benefit_id === id);
  const totalUsed = usage?.total_used ?? 0;
  const remaining = usage?.remaining ?? null;
  const limitAmount = benefit?.limit_amount ?? null;
  const hasLimit = limitAmount !== null;
  const percentage = hasLimit && limitAmount > 0 ? Math.min(100, (totalUsed / limitAmount) * 100) : 0;
  const isNearLimit = hasLimit && percentage >= 80;
  const isAtLimit = hasLimit && percentage >= 100;
  const progressColor = isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-perky-500';

  if (loadingBenefit) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-perky-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!benefit) {
    return (
      <Layout>
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Benefit not found</h2>
          <Link to="/dashboard" className="btn-primary inline-block mt-4">Back to Dashboard</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard" className="text-sm text-perky-600 hover:text-perky-700 font-medium mb-3 inline-block">
          ← Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{CATEGORY_ICONS[benefit.category] || '📋'}</span>
          <h1 className="text-2xl font-bold text-ink">{benefit.name}</h1>
          <span className="badge-brutal bg-gray-100 text-ink text-xs capitalize">
            {benefit.category.replace('_', ' ')}
          </span>
        </div>
        {benefit.clause_reference && (
          <p className="text-sm text-gray-500 mt-1 ml-10">{benefit.clause_reference}</p>
        )}
      </div>

      {/* At a Glance */}
      <div className="card-brutal p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">At a Glance</h2>
        {benefit.description && (
          <p className="text-gray-700 mb-3">{benefit.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {hasLimit && (
            <span className="font-medium">
              {benefit.limit_amount} {benefit.unit_type} {PERIOD_LABELS[benefit.period]}
            </span>
          )}
          {!hasLimit && (
            <span className="font-medium">{PERIOD_LABELS[benefit.period]}</span>
          )}
        </div>
        {benefit.eligibility_notes && (
          <p className="text-sm text-gray-500 italic mt-3">{benefit.eligibility_notes}</p>
        )}
      </div>

      {/* Your Usage */}
      <div className="card-brutal p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Usage</h2>

        {/* Progress bar */}
        {hasLimit ? (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">
                {totalUsed} {benefit.unit_type} used
              </span>
              <span className="font-medium text-gray-900">
                {remaining} {benefit.unit_type} remaining
              </span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-[4px] border-2 border-ink overflow-hidden">
              <div
                className={`h-full rounded-[2px] transition-all duration-300 ${progressColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {benefit.limit_amount} {benefit.unit_type} {PERIOD_LABELS[benefit.period]}
            </p>
          </div>
        ) : (
          <div className="mb-4 text-sm">
            <span className="text-gray-600">{totalUsed} {benefit.unit_type} used</span>
            <span className="text-gray-400 ml-1">({PERIOD_LABELS[benefit.period]})</span>
          </div>
        )}

        {/* Log usage button */}
        <button
          onClick={() => setShowLogModal(true)}
          disabled={isAtLimit}
          className={`btn-primary btn-sm text-sm mb-4 ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isAtLimit ? 'Limit Reached' : `Log ${benefit.unit_type === 'dollars' ? 'Spend' : 'Usage'}`}
        </button>

        {/* Usage history */}
        <div className="border-t-3 border-ink/10 pt-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">History</h3>
          <UsageHistory benefitId={id!} unitType={benefit.unit_type} />
        </div>
      </div>

      {/* Exact Wording */}
      {benefit.clause_text && (
        <div className="card-brutal p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Exact Wording</h2>
          {benefit.clause_reference && (
            <p className="text-xs text-gray-400 mb-2">{benefit.clause_reference}</p>
          )}
          <blockquote className="bg-[#fafaf5] border-l-4 border-fight-500 pl-4 py-3 text-ink/80 italic text-sm whitespace-pre-wrap">
            {benefit.clause_text}
          </blockquote>
        </div>
      )}

      {/* What This Means */}
      {benefit.plain_english && (
        <div className="card-brutal p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">What This Means</h2>
          <p className="text-gray-700 leading-relaxed">{benefit.plain_english}</p>
        </div>
      )}

      {/* How to Claim */}
      {benefit.claim_process && (
        <div className="card-brutal p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">How to Claim</h2>
            {!benefit.clause_text && (
              <span className="badge-brutal bg-fight-100 text-fight-800 text-[10px]">AI suggested</span>
            )}
          </div>
          <p className="text-gray-700 leading-relaxed">{benefit.claim_process}</p>
        </div>
      )}

      {/* Modal */}
      {showLogModal && (
        <LogUsageModal
          benefitId={id!}
          benefitName={benefit.name}
          unitType={benefit.unit_type}
          remaining={remaining}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </Layout>
  );
}
