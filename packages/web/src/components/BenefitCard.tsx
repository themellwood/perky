import { useState } from 'react';
import { useBenefitRules, useAddBenefitRule, useDeleteBenefitRule } from '../hooks/useBenefitRules';
import type { EligibilityRule } from '../hooks/useBenefitRules';

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

  const { data: rules = [] } = useBenefitRules(benefit?.id ?? null);
  const addRule = useAddBenefitRule(benefit?.id ?? '');
  const deleteRule = useDeleteBenefitRule(benefit?.id ?? '');

  const [newRuleKey, setNewRuleKey] = useState('tenure_months');
  const [newRuleOp, setNewRuleOp] = useState('gte');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleLabel, setNewRuleLabel] = useState('');
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

      {/* ── Eligibility Rules ────────────────────────────────── */}
      {mode === 'edit' && (
        <div className="border-t border-ink/10 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-ink mb-3">Eligibility Rules</h4>

          {/* Existing rules */}
          {rules.length > 0 ? (
            <ul className="space-y-2 mb-3">
              {rules.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between gap-2 text-sm bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
                  <span className="text-gray-700">{rule.label}</span>
                  <button
                    type="button"
                    onClick={() => deleteRule.mutate(rule.id)}
                    className="text-red-500 hover:text-red-700 font-bold text-xs"
                    title="Remove rule"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 mb-3">No eligibility rules — benefit applies to all members.</p>
          )}

          {/* Add rule form */}
          <details className="text-sm">
            <summary className="cursor-pointer text-perky-600 font-medium hover:underline">+ Add rule</summary>
            <div className="mt-3 space-y-2 p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Attribute</label>
                  <select
                    value={newRuleKey}
                    onChange={(e) => {
                      setNewRuleKey(e.target.value);
                      setNewRuleOp(e.target.value === 'tenure_months' ? 'gte' : 'eq');
                      setNewRuleValue('');
                    }}
                    className="input-brutal w-full text-xs py-1"
                  >
                    <option value="tenure_months">Tenure (months)</option>
                    <option value="employment_type">Employment type</option>
                    <option value="job_title">Job title</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Condition</label>
                  <select
                    value={newRuleOp}
                    onChange={(e) => setNewRuleOp(e.target.value)}
                    className="input-brutal w-full text-xs py-1"
                  >
                    {newRuleKey === 'tenure_months' && <>
                      <option value="gte">at least</option>
                      <option value="lte">at most</option>
                    </>}
                    {newRuleKey === 'employment_type' && <>
                      <option value="eq">is exactly</option>
                      <option value="neq">is not</option>
                    </>}
                    {newRuleKey === 'job_title' && <>
                      <option value="contains">contains</option>
                      <option value="eq">is exactly</option>
                    </>}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Value</label>
                  {newRuleKey === 'employment_type' ? (
                    <select
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      className="input-brutal w-full text-xs py-1"
                    >
                      <option value="">— Select —</option>
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="casual">Casual</option>
                      <option value="permanent">Permanent</option>
                      <option value="fixed_term">Fixed-term</option>
                    </select>
                  ) : (
                    <input
                      type={newRuleKey === 'tenure_months' ? 'number' : 'text'}
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      placeholder={newRuleKey === 'tenure_months' ? 'e.g. 6' : 'e.g. Manager'}
                      className="input-brutal w-full text-xs py-1"
                      min={newRuleKey === 'tenure_months' ? 0 : undefined}
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Label (shown to user)</label>
                <input
                  type="text"
                  value={newRuleLabel}
                  onChange={(e) => setNewRuleLabel(e.target.value)}
                  placeholder="e.g. 6+ months tenure required"
                  className="input-brutal w-full text-xs py-1"
                  maxLength={300}
                />
              </div>
              <button
                type="button"
                disabled={!newRuleValue || !newRuleLabel || addRule.isPending}
                onClick={async () => {
                  if (!newRuleValue || !newRuleLabel) return;
                  await addRule.mutateAsync({
                    key: newRuleKey,
                    operator: newRuleOp as EligibilityRule['operator'],
                    value: newRuleValue,
                    label: newRuleLabel,
                  });
                  setNewRuleValue('');
                  setNewRuleLabel('');
                }}
                className="btn-primary text-xs py-1 px-3"
              >
                {addRule.isPending ? 'Adding…' : 'Add rule'}
              </button>
            </div>
          </details>
        </div>
      )}

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
