import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { UsageSummary } from '../hooks/useUsage';
import { LogUsageModal } from './LogUsageModal';
import { UsageHistory } from './UsageHistory';

const CATEGORY_ICONS: Record<string, string> = {
  leave: '🏖️',
  health: '🏥',
  financial: '💰',
  professional_development: '📚',
  workplace: '🏢',
  other: '📋',
  pay: '💵',
  protection: '🛡️',
  process: '⚖️',
};

const CATEGORY_COLORS: Record<string, string> = {
  leave: 'bg-blue-50 border-blue-200',
  health: 'bg-green-50 border-green-200',
  financial: 'bg-yellow-50 border-yellow-200',
  professional_development: 'bg-purple-50 border-purple-200',
  workplace: 'bg-orange-50 border-orange-200',
  other: 'bg-gray-50 border-gray-200',
  pay: 'bg-emerald-50 border-emerald-200',
  protection: 'bg-red-50 border-red-200',
  process: 'bg-slate-50 border-slate-200',
};

const PERIOD_LABELS: Record<string, string> = {
  per_month: 'per month',
  per_year: 'per year',
  per_occurrence: 'per occurrence',
  unlimited: 'unlimited',
};

function formatUnit(amount: number, unitType: string): string {
  if (unitType === 'dollars') return `$${amount.toLocaleString()}`;
  return `${amount} ${unitType}`;
}

interface Props {
  summary: UsageSummary;
}

export function BenefitDashboardCard({ summary }: Props) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const {
    benefit_id,
    benefit_name,
    benefit_description,
    category,
    unit_type,
    limit_amount,
    period,
    eligibility_notes,
    total_used,
    remaining,
  } = summary;

  const hasLimit = limit_amount !== null;
  const percentage = hasLimit && limit_amount > 0 ? Math.min(100, (total_used / limit_amount) * 100) : 0;
  const isNearLimit = hasLimit && percentage >= 80;
  const isAtLimit = hasLimit && percentage >= 100;

  const progressColor = isAtLimit
    ? 'bg-red-500'
    : isNearLimit
      ? 'bg-amber-500'
      : 'bg-perky-500';

  return (
    <>
      <div className={`rounded-brutal border-3 border-ink p-4 shadow-brutal hover:shadow-brutal-md transition-all ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{CATEGORY_ICONS[category] || '📋'}</span>
            <h3 className="font-semibold text-gray-900">{benefit_name}</h3>
          </div>
          <span className="text-xs px-2 py-0.5 badge-brutal bg-white text-ink capitalize">
            {category.replace('_', ' ')}
          </span>
        </div>

        {benefit_description && (
          <p className="text-sm text-gray-600 mb-3">{benefit_description}</p>
        )}

        {/* Usage display */}
        <div className="mb-3">
          {hasLimit ? (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {formatUnit(total_used, unit_type)} used
                </span>
                <span className="font-medium text-gray-900">
                  {formatUnit(remaining!, unit_type)} remaining
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-[4px] border-2 border-ink overflow-hidden">
                <div
                  className={`h-full rounded-[2px] transition-all duration-300 ${progressColor}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatUnit(limit_amount, unit_type)} {PERIOD_LABELS[period]}
              </p>
            </>
          ) : (
            <div className="text-sm">
              <span className="text-gray-600">
                {formatUnit(total_used, unit_type)} used
              </span>
              <span className="text-gray-400 ml-1">
                ({PERIOD_LABELS[period]})
              </span>
            </div>
          )}
        </div>

        {eligibility_notes && (
          <p className="text-xs text-gray-500 italic mb-3">{eligibility_notes}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogModal(true)}
            disabled={isAtLimit}
            className={`flex-1 btn-secondary btn-sm text-sm ${isAtLimit ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''}`}
          >
            {isAtLimit ? <span className="badge-brutal">Limit Reached</span> : `Log ${unit_type === 'dollars' ? 'Spend' : 'Usage'}`}
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-secondary btn-sm text-sm"
          >
            History
          </button>
        </div>

        {/* Detail link */}
        <Link
          to={`/benefits/${benefit_id}`}
          className="block text-center text-sm text-perky-600 hover:text-perky-700 font-semibold mt-2"
        >
          View details →
        </Link>

        {/* Expandable history */}
        {showHistory && (
          <div className="mt-3 pt-3 border-t-3 border-ink/20">
            <UsageHistory benefitId={benefit_id} unitType={unit_type} />
          </div>
        )}
      </div>

      {showLogModal && (
        <LogUsageModal
          benefitId={benefit_id}
          benefitName={benefit_name}
          unitType={unit_type}
          remaining={remaining}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </>
  );
}
