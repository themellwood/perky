import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface Union {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useUnions() {
  return useQuery({
    queryKey: ['unions'],
    queryFn: () => api.get<{ data: Union[] }>('/unions').then(r => r.data),
  });
}

export function useUnion(id: string) {
  return useQuery({
    queryKey: ['unions', id],
    queryFn: () => api.get<{ data: Union }>(`/unions/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateUnion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<{ data: Union }>('/unions', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['unions'] }),
  });
}

export function useAssignAdmin() {
  return useMutation({
    mutationFn: ({ unionId, email }: { unionId: string; email: string }) =>
      api.post(`/unions/${unionId}/admins`, { email }),
  });
}

export function useUnionMembers(unionId: string) {
  return useQuery({
    queryKey: ['unions', unionId, 'members'],
    queryFn: () => api.get<{ data: any[] }>(`/unions/${unionId}/members`).then(r => r.data),
    enabled: !!unionId,
  });
}
