import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface ExtractedBenefit {
  name: string;
  description: string;
  category: string;
  unit_type: string;
  limit_amount: number | null;
  period: string;
  eligibility_notes: string | null;
  clause_text: string | null;
  plain_english: string | null;
  claim_process: string | null;
  clause_reference: string | null;
}

export interface ExtractionResult {
  benefits: ExtractedBenefit[];
  agreement_title_suggestion: string | null;
  raw_summary: string;
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agreementId, file }: { agreementId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('perky_token');
      const response = await fetch(`/api/documents/upload/${agreementId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `Upload failed: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['agreement', vars.agreementId] });
    },
  });
}

export function useExtractBenefits() {
  return useMutation({
    mutationFn: async (agreementId: string) => {
      const res = await api.post<{ data: ExtractionResult }>(`/documents/extract/${agreementId}`);
      return res.data;
    },
  });
}

export function useAcceptExtraction() {
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
      const res = await api.post<{ data: { count: number } }>(`/documents/accept/${agreementId}`, {
        benefits,
        title,
      });
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['agreement', vars.agreementId] });
      qc.invalidateQueries({ queryKey: ['benefits', vars.agreementId] });
    },
  });
}

export function useRemoveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agreementId: string) => {
      return api.delete(`/documents/remove/${agreementId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreement'] });
    },
  });
}
