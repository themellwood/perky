import { useState } from 'react';
import { useLogUsage } from '../hooks/useUsage';

interface Props {
  benefitId: string;
  benefitName: string;
  unitType: string;
  remaining: number | null;
  onClose: () => void;
}

export function LogUsageModal({ benefitId, benefitName, unitType, remaining, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('1');
  const [usedOn, setUsedOn] = useState(today);
  const [note, setNote] = useState('');
  const logUsage = useLogUsage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (numAmount <= 0) return;

    await logUsage.mutateAsync({
      benefit_id: benefitId,
      amount: numAmount,
      used_on: usedOn,
      note: note || undefined,
    });

    onClose();
  };

  const unitLabel = unitType === 'dollars' ? 'Amount ($)' : `Amount (${unitType})`;

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
      <div className="card-brutal max-w-md w-full p-6 shadow-brutal-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Log Usage</h2>
          <button onClick={onClose} className="text-ink hover:text-red-500 text-xl font-bold">&times;</button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {benefitName}
          {remaining !== null && (
            <span className="text-gray-400 ml-1">
              ({remaining} {unitType} remaining)
            </span>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{unitLabel}</label>
            <input
              type="number"
              step="any"
              min="0.01"
              max={remaining ?? undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="input-brutal w-full text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={usedOn}
              onChange={(e) => setUsedOn(e.target.value)}
              max={today}
              required
              className="input-brutal w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Doctor's appointment"
              className="input-brutal w-full text-sm"
            />
          </div>

          {logUsage.isError && (
            <p className="text-sm text-red-600">{logUsage.error?.message || 'Failed to log usage'}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={logUsage.isPending}
              className="btn-primary flex-1"
            >
              {logUsage.isPending ? 'Logging...' : 'Log Usage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
