import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface UsageSummary {
  benefit_id: string;
  benefit_name: string;
  benefit_description: string | null;
  category: string;
  unit_type: string;
  limit_amount: number | null;
  period: string;
  eligibility_notes: string | null;
  total_used: number;
  remaining: number | null;
  agreement_id: string;
  agreement_title: string;
  clause_text: string | null;
  plain_english: string | null;
  claim_process: string | null;
  clause_reference: string | null;
  eligible: true | false | 'unknown';
  unmet_rules: string[];
}

export interface UsageLog {
  id: string;
  user_id: string;
  benefit_id: string;
  amount: number;
  used_on: string;
  note: string | null;
  created_at: string;
  benefit_name: string;
  unit_type: string;
  category: string;
}

export function useUsageSummary() {
  return useQuery({
    queryKey: ['usage', 'summary'],
    queryFn: () => api.get<{ data: UsageSummary[] }>('/usage/summary').then(r => r.data),
  });
}

export function useUsageLogs(benefitId?: string) {
  const params = benefitId ? `?benefit_id=${benefitId}` : '';
  return useQuery({
    queryKey: ['usage', 'logs', benefitId || 'all'],
    queryFn: () => api.get<{ data: UsageLog[] }>(`/usage${params}`).then(r => r.data),
  });
}

export function useLogUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { benefit_id: string; amount: number; used_on: string; note?: string }) =>
      api.post<{ data: UsageLog }>('/usage', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

export function useDeleteUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/usage/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}
