import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { useUnion } from '../../hooks/useUnions';
import { api } from '../../lib/api-client';

interface BenefitUsage {
  benefit_id: string;
  benefit_name: string;
  category: string;
  unit_type: string;
  limit_amount: number | null;
  period: string;
  agreement_title: string;
  total_members: number;
  members_using: number;
  usage_this_month: number;
  usage_this_year: number;
  usage_all_time: number;
}

interface AnalyticsData {
  summary: {
    total_members: number;
    total_agreements: number;
  };
  benefit_usage: BenefitUsage[];
  recent_activity: {
    amount: number;
    used_on: string;
    created_at: string;
    benefit_name: string;
    unit_type: string;
    agreement_title: string;
  }[];
}

function useAnalytics(unionId: string) {
  return useQuery({
    queryKey: ['analytics', unionId],
    queryFn: () => api.get<{ data: AnalyticsData }>(`/analytics/union/${unionId}`).then(r => r.data),
    enabled: !!unionId,
  });
}

function formatUnit(amount: number, unitType: string): string {
  if (unitType === 'dollars') return `$${amount.toLocaleString()}`;
  return `${amount} ${unitType}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CATEGORY_COLORS: Record<string, string> = {
  leave: 'bg-blue-100 text-blue-800',
  health: 'bg-green-100 text-green-800',
  financial: 'bg-yellow-100 text-yellow-800',
  professional_development: 'bg-purple-100 text-purple-800',
  workplace: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
};

export function AnalyticsPage() {
  const { unionId } = useParams<{ unionId: string }>();
  const { data: union } = useUnion(unionId!);
  const { data: analytics, isLoading } = useAnalytics(unionId!);

  if (!union) return <Layout><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perky-600" /></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <Link to={`/admin/unions/${unionId}`} className="text-sm text-perky-600 hover:text-perky-700">&larr; Back to union</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{(union as any).name} — Analytics</h1>
        <p className="text-sm text-gray-500">Aggregate benefit usage across all members</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-perky-600 border-t-transparent" />
        </div>
      ) : analytics ? (
        <div className="space-y-8">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-brutal p-4 text-center">
              <p className="text-3xl font-bold text-perky-700">{analytics.summary.total_members}</p>
              <p className="text-sm text-gray-500">Total Members</p>
            </div>
            <div className="card-brutal p-4 text-center">
              <p className="text-3xl font-bold text-perky-700">{analytics.summary.total_agreements}</p>
              <p className="text-sm text-gray-500">Agreements</p>
            </div>
          </div>

          {/* Benefit usage table */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Benefit Usage</h2>
            {analytics.benefit_usage.length === 0 ? (
              <p className="text-gray-500 text-sm">No usage data yet</p>
            ) : (
              <div className="card-brutal overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2 border-ink">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Benefit</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Members Using</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">This Month</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">This Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-ink">
                    {analytics.benefit_usage.map((bu) => (
                      <tr key={bu.benefit_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{bu.benefit_name}</p>
                          <p className="text-xs text-gray-400">{bu.agreement_title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[bu.category] || CATEGORY_COLORS.other}`}>
                            {bu.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {bu.members_using} / {bu.total_members}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatUnit(bu.usage_this_month, bu.unit_type)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatUnit(bu.usage_this_year, bu.unit_type)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h2>
            {analytics.recent_activity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              <div className="card-brutal divide-y-2 divide-ink">
                {analytics.recent_activity.map((activity, i) => (
                  <div key={i} className="px-4 py-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-gray-700">{activity.benefit_name}</span>
                      <span className="text-gray-400 ml-2">({activity.agreement_title})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatUnit(activity.amount, activity.unit_type)}</span>
                      <span className="text-gray-400 text-xs">{formatDate(activity.used_on)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
