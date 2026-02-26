import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface Agreement {
  id: string;
  union_id: string;
  title: string;
  status: string;
  access_code: string | null;
  document_url: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export function useAgreements(unionId: string) {
  return useQuery({
    queryKey: ['agreements', unionId],
    queryFn: () => api.get<{ data: Agreement[] }>(`/agreements/union/${unionId}`).then(r => r.data),
    enabled: !!unionId,
  });
}

export function useAgreement(id: string) {
  return useQuery({
    queryKey: ['agreement', id],
    queryFn: () => api.get<{ data: Agreement }>(`/agreements/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ unionId, title }: { unionId: string; title: string }) =>
      api.post<{ data: Agreement }>(`/agreements/union/${unionId}`, { title }).then(r => r.data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['agreements', vars.unionId] }),
  });
}

export function usePublishAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<{ data: Agreement }>(`/agreements/${id}/publish`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agreements'] }),
  });
}
