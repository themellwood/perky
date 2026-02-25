// packages/web/src/hooks/useProfile.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface UserAttributes {
  start_date?: string;
  employment_type?: 'full_time' | 'part_time' | 'casual' | 'permanent' | 'fixed_term';
  job_title?: string;
  [key: string]: string | undefined;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'attributes'],
    queryFn: () =>
      api.get<{ data: UserAttributes }>('/profile/attributes').then((r) => r.data),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attrs: UserAttributes) =>
      api.put<{ data: UserAttributes }>('/profile/attributes', attrs).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', 'attributes'] });
      qc.invalidateQueries({ queryKey: ['usage', 'summary'] });
    },
  });
}
