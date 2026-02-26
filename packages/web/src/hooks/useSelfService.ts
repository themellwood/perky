import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { ExtractionResult, ExtractedBenefit } from './useDocuments';

interface PersonalAgreement {
  id: string;
  title: string;
  status: string;
  document_url: string | null;
  created_at: string;
  updated_at: string;
  benefit_count: number;
}

export function usePersonalAgreements() {
  return useQuery({
    queryKey: ['self-service', 'agreements'],
    queryFn: () =>
      api.get<{ data: PersonalAgreement[] }>('/self-service/agreements').then((r) => r.data),
  });
}

export function usePersonalUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, title }: { file: File; title?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);

      const response = await fetch('/api/self-service/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `Upload failed: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-service', 'agreements'] });
    },
  });
}

export function usePersonalExtract() {
  return useMutation({
    mutationFn: async (agreementId: string) => {
      const res = await api.post<{ data: ExtractionResult }>(
        `/self-service/extract/${agreementId}`
      );
      return res.data;
    },
  });
}

export function usePersonalAccept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agreementId,
      benefits,
      title,
    }: {
      agreementId: string;
      benefits: ExtractedBenefit[];
      title?: string;
    }) => {
      const res = await api.post<{ data: { count: number } }>(
        `/self-service/accept/${agreementId}`,
        { benefits, title }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-service', 'agreements'] });
      qc.invalidateQueries({ queryKey: ['member', 'agreements'] });
      qc.invalidateQueries({ queryKey: ['usage', 'summary'] });
    },
  });
}

export function useDeletePersonalAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agreementId: string) => {
      return api.delete(`/self-service/${agreementId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-service', 'agreements'] });
      qc.invalidateQueries({ queryKey: ['member', 'agreements'] });
      qc.invalidateQueries({ queryKey: ['usage', 'summary'] });
    },
  });
}
