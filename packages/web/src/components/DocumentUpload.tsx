import { useState, useRef } from 'react';
import {
  useUploadDocument,
  useExtractBenefits,
  useAcceptExtraction,
  useRemoveDocument,
  type ExtractedBenefit,
} from '../hooks/useDocuments';

const CATEGORIES = [
  { value: 'leave', label: 'Leave' },
  { value: 'health', label: 'Health' },
  { value: 'financial', label: 'Financial' },
  { value: 'professional_development', label: 'Professional Development' },
  { value: 'workplace', label: 'Workplace' },
  { value: 'other', label: 'Other' },
  { value: 'pay', label: 'Pay' },
  { value: 'protection', label: 'Protection' },
  { value: 'process', label: 'Process' },
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

type Phase = 'idle' | 'uploading' | 'analyzing' | 'review';

const PHASES: { key: Phase; label: string; description: string }[] = [
  { key: 'uploading', label: 'Upload', description: 'Storing document' },
  { key: 'analyzing', label: 'AI Analysis', description: 'Reading & extracting benefits' },
  { key: 'review', label: 'Review', description: 'Check extracted benefits' },
];

interface Props {
  agreementId: string;
  hasDocument: boolean;
  onComplete: () => void;
}

export function DocumentUpload({ agreementId, hasDocument, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [isRateLimit, setIsRateLimit] = useState(false);
  const [extractedBenefits, setExtractedBenefits] = useState<ExtractedBenefit[]>([]);
  const [titleSuggestion, setTitleSuggestion] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzeSeconds, setAnalyzeSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadDoc = useUploadDocument();
  const extractBenefits = useExtractBenefits();
  const acceptExtraction = useAcceptExtraction();
  const removeDocument = useRemoveDocument();

  const startTimer = () => {
    setAnalyzeSeconds(0);
    timerRef.current = setInterval(() => setAnalyzeSeconds((s) => s + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are accepted');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError('File must be under 25MB');
        return;
      }
      setSelectedFile(file);
      setError('');
      setIsRateLimit(false);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!selectedFile) return;
    setError('');
    setIsRateLimit(false);

    try {
      // Phase 1: Upload to storage
      setPhase('uploading');
      await uploadDoc.mutateAsync({ agreementId, file: selectedFile });

      // Phase 2: AI extraction
      setPhase('analyzing');
      startTimer();
      const result = await extractBenefits.mutateAsync(agreementId);
      stopTimer();

      setExtractedBenefits(result.benefits);
      setTitleSuggestion(result.agreement_title_suggestion || '');
      setSummary(result.raw_summary || '');

      // Phase 3: Review
      setPhase('review');
    } catch (err) {
      stopTimer();
      const msg = err instanceof Error ? err.message : 'Operation failed';
      const rateLimited = msg.toLowerCase().includes('rate limit') || msg.includes('429');
      setIsRateLimit(rateLimited);
      setError(msg);
      // Stay at idle so user can retry
      setPhase('idle');
    }
  };

  const handleExtractOnly = async () => {
    setError('');
    setIsRateLimit(false);
    try {
      setPhase('analyzing');
      startTimer();
      const result = await extractBenefits.mutateAsync(agreementId);
      stopTimer();

      setExtractedBenefits(result.benefits);
      setTitleSuggestion(result.agreement_title_suggestion || '');
      setSummary(result.raw_summary || '');
      setPhase('review');
    } catch (err) {
      stopTimer();
      const msg = err instanceof Error ? err.message : 'Extraction failed';
      const rateLimited = msg.toLowerCase().includes('rate limit') || msg.includes('429');
      setIsRateLimit(rateLimited);
      setError(msg);
      setPhase('idle');
    }
  };

  const handleRemoveDocument = async () => {
    if (!confirm('Remove the uploaded PDF? You can upload a different document afterwards.')) return;
    try {
      await removeDocument.mutateAsync(agreementId);
      setSelectedFile(null);
      setExtractedBenefits([]);
      setError('');
      setIsRateLimit(false);
      if (fileRef.current) fileRef.current.value = '';
      onComplete(); // triggers refetch on parent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove document');
    }
  };

  const toggleBenefit = (index: number) => {
    setExtractedBenefits((prev) =>
      prev.map((b, i) => (i === index ? { ...b, _excluded: !(b as any)._excluded } as any : b))
    );
  };

  const updateBenefit = (index: number, field: string, value: any) => {
    setExtractedBenefits((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const handleAccept = async () => {
    const selectedBenefits = extractedBenefits.filter((b) => !(b as any)._excluded);
    if (selectedBenefits.length === 0) {
      setError('Select at least one benefit to add');
      return;
    }

    setError('');
    try {
      await acceptExtraction.mutateAsync({
        agreementId,
        benefits: selectedBenefits,
        title: titleSuggestion || undefined,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save benefits');
    }
  };

  // ── Phase Progress Bar ──────────────────────────────────────────
  const PhaseIndicator = () => {
    if (phase === 'idle') return null;

    const currentIndex = PHASES.findIndex((p) => p.key === phase);

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {PHASES.map((p, i) => {
            const isActive = p.key === phase;
            const isComplete = i < currentIndex;
            const isFuture = i > currentIndex;

            return (
              <div key={p.key} className="flex items-center flex-1">
                {/* Step circle */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-3 ${
                      isComplete
                        ? 'bg-perky-600 text-white border-ink'
                        : isActive
                        ? 'bg-perky-600 text-white border-ink ring-4 ring-fight-200'
                        : 'bg-gray-100 border-ink/30'
                    }`}
                  >
                    {isComplete ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 font-medium ${
                      isActive ? 'text-perky-700' : isFuture ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {p.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < PHASES.length - 1 && (
                  <div className="flex-1 mx-2 mt-[-12px]">
                    <div
                      className={`h-1 transition-all ${
                        i < currentIndex ? 'bg-perky-600' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Uploading Phase ─────────────────────────────────────────────
  if (phase === 'uploading') {
    return (
      <div className="card-brutal p-6">
        <PhaseIndicator />
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-perky-600 border-t-transparent mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-1">Uploading Document</h3>
          <p className="text-sm text-gray-500">Storing your PDF securely...</p>
        </div>
      </div>
    );
  }

  // ── Analyzing Phase ─────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="card-brutal p-6">
        <PhaseIndicator />
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-perky-600 border-t-transparent mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-1">AI is Analyzing Your Document</h3>
          <p className="text-sm text-gray-500 mb-3">
            Scanning the agreement and extracting benefit details... This uses two AI passes.
          </p>

          {/* Timer */}
          <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-brutal border-2 border-ink/20">
            <div className="w-2 h-2 bg-perky-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600 font-mono">
              {Math.floor(analyzeSeconds / 60)}:{String(analyzeSeconds % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-xs text-gray-400">
              Large documents (100+ pages) can take 60–90 seconds
            </p>
            <p className="text-xs text-gray-400">
              Please keep this page open while analysis completes
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Review Phase ────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div className="card-brutal p-6">
        <PhaseIndicator />

        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Review Extracted Benefits</h3>
            <p className="text-sm text-gray-500">
              Found {extractedBenefits.length} benefits. Review, edit, or uncheck to exclude before saving.
            </p>
          </div>
          <button
            onClick={() => { setPhase('idle'); setExtractedBenefits([]); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Start Over
          </button>
        </div>

        {summary && (
          <div className="bg-perky-50 border-2 border-perky-600 rounded-brutal p-3 mb-4 text-sm text-perky-800">
            <strong>AI Summary:</strong> {summary}
          </div>
        )}

        {titleSuggestion && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Suggested Title</label>
            <input
              value={titleSuggestion}
              onChange={(e) => setTitleSuggestion(e.target.value)}
              className="input-brutal w-full px-3 py-2 text-sm focus:ring-2 focus:ring-perky-500"
            />
          </div>
        )}

        <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto">
          {extractedBenefits.map((benefit, index) => {
            const excluded = (benefit as any)._excluded;
            return (
              <div
                key={index}
                className={`border-3 rounded-brutal p-4 transition-opacity ${
                  excluded ? 'opacity-40 border-ink/20 bg-gray-50' : 'border-perky-600 bg-perky-50/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!excluded}
                      onChange={() => toggleBenefit(index)}
                      className="rounded border-gray-300 text-perky-600 focus:ring-perky-500"
                    />
                    <span className="font-medium text-gray-900">{benefit.name}</span>
                  </label>
                </div>

                {!excluded && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="col-span-2">
                      <input
                        value={benefit.name}
                        onChange={(e) => updateBenefit(index, 'name', e.target.value)}
                        placeholder="Name"
                        className="input-brutal w-full px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        value={benefit.description || ''}
                        onChange={(e) => updateBenefit(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="input-brutal w-full px-2 py-1.5 text-sm"
                      />
                    </div>
                    <select
                      value={benefit.category}
                      onChange={(e) => updateBenefit(index, 'category', e.target.value)}
                      className="input-brutal px-2 py-1.5 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <select
                      value={benefit.unit_type}
                      onChange={(e) => updateBenefit(index, 'unit_type', e.target.value)}
                      className="input-brutal px-2 py-1.5 text-sm"
                    >
                      {UNIT_TYPES.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="any"
                      value={benefit.limit_amount ?? ''}
                      onChange={(e) =>
                        updateBenefit(index, 'limit_amount', e.target.value ? Number(e.target.value) : null)
                      }
                      placeholder="Limit (blank = unlimited)"
                      className="input-brutal px-2 py-1.5 text-sm"
                    />
                    <select
                      value={benefit.period}
                      onChange={(e) => updateBenefit(index, 'period', e.target.value)}
                      className="input-brutal px-2 py-1.5 text-sm"
                    >
                      {PERIODS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <div className="col-span-2">
                      <input
                        value={benefit.eligibility_notes || ''}
                        onChange={(e) => updateBenefit(index, 'eligibility_notes', e.target.value || null)}
                        placeholder="Eligibility notes (optional)"
                        className="input-brutal w-full px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">Clause Reference</label>
                      <input
                        value={benefit.clause_reference || ''}
                        onChange={(e) => updateBenefit(index, 'clause_reference', e.target.value || null)}
                        placeholder="e.g., Section 14.3"
                        className="input-brutal w-full px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">Exact Clause Text</label>
                      <textarea
                        value={benefit.clause_text || ''}
                        onChange={(e) => updateBenefit(index, 'clause_text', e.target.value || null)}
                        placeholder="Exact wording from the agreement..."
                        rows={3}
                        className="input-brutal w-full px-2 py-1.5 text-sm resize-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">Plain English</label>
                      <textarea
                        value={benefit.plain_english || ''}
                        onChange={(e) => updateBenefit(index, 'plain_english', e.target.value || null)}
                        placeholder="What this benefit means in simple terms..."
                        rows={2}
                        className="input-brutal w-full px-2 py-1.5 text-sm resize-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">How to Claim</label>
                      <textarea
                        value={benefit.claim_process || ''}
                        onChange={(e) => updateBenefit(index, 'claim_process', e.target.value || null)}
                        placeholder="Steps to claim this benefit..."
                        rows={2}
                        className="input-brutal w-full px-2 py-1.5 text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => { setPhase('idle'); setExtractedBenefits([]); }}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={acceptExtraction.isPending}
            className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
          >
            {acceptExtraction.isPending
              ? 'Saving...'
              : `Add ${extractedBenefits.filter((b) => !(b as any)._excluded).length} Benefits`}
          </button>
        </div>
      </div>
    );
  }

  // ── Idle Phase (upload or manage document) ──────────────────────
  return (
    <div className="bg-white border-3 border-ink border-dashed rounded-brutal p-6">
      <div className="text-center">
        <div className="text-3xl mb-2">📄</div>
        <h3 className="font-semibold text-gray-900 mb-1">
          {hasDocument ? 'Document Uploaded' : 'Upload Collective Agreement'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {hasDocument
            ? 'Your PDF is stored. You can extract benefits or replace the document.'
            : 'Upload a PDF and we\'ll use AI to extract benefits automatically'}
        </p>

        {/* Error / Rate Limit Message */}
        {error && (
          <div className={`rounded-brutal p-3 mb-4 text-sm ${isRateLimit ? 'bg-amber-50 text-amber-800 border-2 border-amber-400' : 'bg-red-50 text-red-800 border-2 border-red-400'}`}>
            {isRateLimit ? (
              <>
                <strong>Rate limit reached.</strong> Large documents use many AI tokens.
                Please wait <strong>1–2 minutes</strong> then try again.
              </>
            ) : (
              error
            )}
          </div>
        )}

        {/* Has document — show extract + remove options */}
        {hasDocument ? (
          <div className="space-y-3">
            <button
              onClick={handleExtractOnly}
              disabled={extractBenefits.isPending}
              className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
            >
              {isRateLimit ? 'Retry Extraction' : 'Extract Benefits with AI'}
            </button>

            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                onClick={handleRemoveDocument}
                disabled={removeDocument.isPending}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {removeDocument.isPending ? 'Removing...' : 'Remove PDF & upload different document'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* No document — file picker + upload */}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="text-sm text-gray-700 font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-gray-400">
                    ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <button
                  onClick={handleUploadAndExtract}
                  disabled={uploadDoc.isPending || extractBenefits.isPending}
                  className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
                >
                  Upload & Extract Benefits
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Large documents (100+ pages) may take 60–90 seconds to analyze
                </p>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-primary px-4 py-2 text-sm mb-2"
              >
                Choose PDF File
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
