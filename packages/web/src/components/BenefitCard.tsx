import { useState } from 'react';

const CATEGORIES = [
  { value: 'leave', label: 'Leave' },
  { value: 'health', label: 'Health' },
  { value: 'financial', label: 'Financial' },
  { value: 'professional_development', label: 'Professional Development' },
  { value: 'workplace', label: 'Workplace' },
  { value: 'pay', label: 'Pay' },
  { value: 'protection', label: 'Protection' },
  { value: 'process', label: 'Process' },
  { value: 'other', label: 'Other' },
];

const UNIT_TYPES = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'dollars', label: 'Dollars' },
  { value: 'count', label: 'Count' },
];

const PERIODS = [
  { value: 'per_month', label: 'Per Month' },
  { value: 'per_year', label: 'Per Year' },
  { value: 'per_occurrence', label: 'Per Occurrence' },
  { value: 'unlimited', label: 'Unlimited' },
];

interface BenefitData {
  name: string;
  description?: string;
  category: string;
  unit_type: string;
  limit_amount?: number | null;
  period: string;
  eligibility_notes?: string;
  clause_text?: string;
  plain_english?: string;
  claim_process?: string;
  clause_reference?: string;
}

interface Props {
  benefit?: any;
  mode: 'create' | 'edit' | 'view';
  agreementId: string;
  onSave?: (data: BenefitData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
}

export function BenefitCard({ benefit, mode, onSave, onDelete, onCancel }: Props) {
  const [editing, setEditing] = useState(mode === 'create');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BenefitData>({
    name: benefit?.name || '',
    description: benefit?.description || '',
    category: benefit?.category || 'leave',
    unit_type: benefit?.unit_type || 'days',
    limit_amount: benefit?.limit_amount ?? null,
    period: benefit?.period || 'per_year',
    eligibility_notes: benefit?.eligibility_notes || '',
    clause_text: benefit?.clause_text || '',
    plain_english: benefit?.plain_english || '',
    claim_process: benefit?.claim_process || '',
    clause_reference: benefit?.clause_reference || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave?.(form);
      if (mode === 'edit') setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="card-brutal p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{benefit.name}</h3>
              <span className="text-xs px-2 py-0.5 badge-brutal bg-gray-100 text-ink">{benefit.category}</span>
              {benefit.clause_reference && (
                <span className="text-xs text-gray-400 ml-2">({benefit.clause_reference})</span>
              )}
            </div>
            {benefit.description && <p className="text-sm text-gray-600 mt-1">{benefit.description}</p>}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{benefit.limit_amount !== null ? `${benefit.limit_amount} ${benefit.unit_type}` : `Unlimited ${benefit.unit_type}`}</span>
              <span>{PERIODS.find(p => p.value === benefit.period)?.label}</span>
            </div>
            {benefit.eligibility_notes && <p className="text-xs text-gray-400 mt-1">{benefit.eligibility_notes}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="text-sm text-perky-600 hover:text-perky-700 font-bold">Edit</button>
            {onDelete && (
              <button onClick={onDelete} className="text-sm text-red-600 hover:text-red-700 font-bold">Delete</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-brutal p-4 mb-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
            className="input-brutal w-full text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            className="input-brutal w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
            className="select-brutal w-full text-sm">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Unit Type</label>
          <select value={form.unit_type} onChange={e => setForm({...form, unit_type: e.target.value})}
            className="select-brutal w-full text-sm">
            {UNIT_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Limit Amount</label>
          <input type="number" step="any" value={form.limit_amount ?? ''} placeholder="Leave blank for unlimited"
            onChange={e => setForm({...form, limit_amount: e.target.value ? Number(e.target.value) : null})}
            className="input-brutal w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
          <select value={form.period} onChange={e => setForm({...form, period: e.target.value})}
            className="select-brutal w-full text-sm">
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Eligibility Notes</label>
          <textarea value={form.eligibility_notes} onChange={e => setForm({...form, eligibility_notes: e.target.value})}
            rows={2} className="input-brutal w-full text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Clause Reference</label>
          <input value={form.clause_reference} onChange={e => setForm({...form, clause_reference: e.target.value})}
            placeholder="e.g., Section 14.3" className="input-brutal w-full text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Exact Clause Text</label>
          <textarea value={form.clause_text} onChange={e => setForm({...form, clause_text: e.target.value})}
            rows={3} placeholder="Exact wording from the agreement" className="input-brutal w-full text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Plain English</label>
          <textarea value={form.plain_english} onChange={e => setForm({...form, plain_english: e.target.value})}
            rows={2} placeholder="What this means in simple terms" className="input-brutal w-full text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">How to Claim</label>
          <textarea value={form.claim_process} onChange={e => setForm({...form, claim_process: e.target.value})}
            rows={2} placeholder="Steps to claim this benefit" className="input-brutal w-full text-sm" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        {(onCancel || mode === 'edit') && (
          <button type="button" onClick={() => { onCancel?.(); if (mode === 'edit') setEditing(false); }}
            className="btn-secondary btn-sm">Cancel</button>
        )}
        <button type="submit" disabled={saving}
          className="btn-primary btn-sm">
          {saving ? 'Saving...' : mode === 'create' ? 'Add Benefit' : 'Save'}
        </button>
      </div>
    </form>
  );
}
