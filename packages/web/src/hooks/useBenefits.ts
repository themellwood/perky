import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface Benefit {
  id: string;
  agreement_id: string;
  name: string;
  description: string | null;
  category: string;
  unit_type: string;
  limit_amount: number | null;
  period: string;
  eligibility_notes: string | null;
  sort_order: number;
  clause_text: string | null;
  plain_english: string | null;
  claim_process: string | null;
  clause_reference: string | null;
}

export function useBenefits(agreementId: string) {
  return useQuery({
    queryKey: ['benefits', agreementId],
    queryFn: () => api.get<{ data: Benefit[] }>(`/benefits/agreement/${agreementId}`).then(r => r.data),
    enabled: !!agreementId,
  });
}

export function useBenefit(id: string) {
  return useQuery({
    queryKey: ['benefit', id],
    queryFn: () => api.get<{ data: Benefit }>(`/benefits/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateBenefit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agreementId, ...data }: { agreementId: string } & Record<string, any>) =>
      api.post<{ data: Benefit }>(`/benefits/agreement/${agreementId}`, data).then(r => r.data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['benefits', vars.agreementId] }),
  });
}

export function useUpdateBenefit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, agreementId, ...data }: { id: string; agreementId: string } & Record<string, any>) =>
      api.put<{ data: Benefit }>(`/benefits/${id}`, data).then(r => r.data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['benefits', vars.agreementId] }),
  });
}

export function useDeleteBenefit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, agreementId }: { id: string; agreementId: string }) =>
      api.delete(`/benefits/${id}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['benefits', vars.agreementId] }),
  });
}
