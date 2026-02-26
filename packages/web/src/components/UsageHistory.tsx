import { useUsageLogs, useDeleteUsage } from '../hooks/useUsage';

interface Props {
  benefitId: string;
  unitType: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(amount: number, unitType: string): string {
  if (unitType === 'dollars') return `$${amount.toLocaleString()}`;
  return `${amount} ${unitType}`;
}

export function UsageHistory({ benefitId, unitType }: Props) {
  const { data: logs, isLoading } = useUsageLogs(benefitId);
  const deleteUsage = useDeleteUsage();

  if (isLoading) {
    return <p className="text-xs text-gray-400">Loading...</p>;
  }

  if (!logs || logs.length === 0) {
    return <p className="text-xs text-gray-400">No usage logged yet</p>;
  }

  return (
    <div className="space-y-1.5">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center justify-between text-xs group border-b-2 border-ink/10 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{formatDate(log.used_on)}</span>
            <span className="font-medium text-gray-700">{formatAmount(log.amount, unitType)}</span>
            {log.note && <span className="text-gray-400 truncate max-w-[150px]">{log.note}</span>}
          </div>
          <button
            onClick={() => deleteUsage.mutate(log.id)}
            disabled={deleteUsage.isPending}
            className="text-ink/30 hover:text-red-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
