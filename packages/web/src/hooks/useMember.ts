import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface MemberAgreementView {
  id: string;
  union_id: string;
  title: string;
  status: string;
  access_code: string | null;
  union_name: string;
  joined_at: string;
  benefit_count: number;
}

export function useMemberAgreements() {
  return useQuery({
    queryKey: ['member', 'agreements'],
    queryFn: () => api.get<{ data: MemberAgreementView[] }>('/member/agreements').then(r => r.data),
  });
}

export function useJoinAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accessCode: string) =>
      api.post<{ data: MemberAgreementView }>('/member/join', { access_code: accessCode }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', 'agreements'] });
      qc.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

export function useLeaveAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agreementId: string) =>
      api.delete<{ success: boolean }>(`/member/agreements/${agreementId}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', 'agreements'] });
      qc.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}
