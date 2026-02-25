// packages/web/src/hooks/useBenefitRules.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface EligibilityRule {
  id: string;
  benefit_id: string;
  key: string;
  operator: 'gte' | 'lte' | 'eq' | 'neq' | 'contains';
  value: string;
  label: string;
  updated_at: string;
}

export function useBenefitRules(benefitId: string | null) {
  return useQuery({
    queryKey: ['benefit-rules', benefitId],
    queryFn: () =>
      api.get<{ data: EligibilityRule[] }>(`/benefits/${benefitId}/eligibility-rules`).then((r) => r.data),
    enabled: !!benefitId,
  });
}

export function useAddBenefitRule(benefitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: Omit<EligibilityRule, 'id' | 'benefit_id' | 'updated_at'>) =>
      api.post<{ data: EligibilityRule }>(`/benefits/${benefitId}/eligibility-rules`, rule).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['benefit-rules', benefitId] });
      qc.invalidateQueries({ queryKey: ['usage', 'summary'] });
    },
  });
}

export function useDeleteBenefitRule(benefitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      api.delete(`/benefits/${benefitId}/eligibility-rules/${ruleId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['benefit-rules', benefitId] });
      qc.invalidateQueries({ queryKey: ['usage', 'summary'] });
    },
  });
}
