import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  usePersonalAgreements,
  usePersonalUpload,
  usePersonalExtract,
  usePersonalAccept,
  useDeletePersonalAgreement,
} from '../hooks/useSelfService';
import {
  useMemberAgreements,
  useLeaveAgreement,
  type MemberAgreementView,
} from '../hooks/useMember';
import type { ExtractedBenefit } from '../hooks/useDocuments';

const CATEGORIES = [
  { value: 'leave', label: 'Leave' },
  { value: 'health', label: 'Health' },
  { value: 'financial', label: 'Financial' },
  { value: 'professional_development', label: 'Professional Development' },
  { value: 'workplace', label: 'Workplace' },
  { value: 'other', label: 'Other' },
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

const PHASE_STEPS: { key: Phase; label: string }[] = [
  { key: 'uploading', label: 'Upload' },
  { key: 'analyzing', label: 'AI Analysis' },
  { key: 'review', label: 'Review' },
];

export function MyAgreementsPage() {
  const { data: personalAgreements, isLoading: personalLoading, refetch } = usePersonalAgreements();
  const { data: unionAgreements, isLoading: unionLoading } = useMemberAgreements();
  const [showUpload, setShowUpload] = useState(false);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Agreements</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the union agreements you've joined and your own uploaded agreements
        </p>
      </div>

      <div className="space-y-10">
        {/* ── Union Agreements Section ── */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Union Agreements</h2>
              <p className="text-sm text-gray-500">Agreements you've joined using an access code</p>
            </div>
            <Link to="/join" className="btn-primary btn-sm">
              + Join Agreement
            </Link>
          </div>

          {unionLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-perky-600 border-t-transparent" />
            </div>
          ) : !unionAgreements || unionAgreements.length === 0 ? (
            <div className="card-brutal p-8 text-center">
              <div className="text-3xl mb-3">🤝</div>
              <h3 className="font-semibold text-gray-900 mb-1">No union agreements joined</h3>
              <p className="text-gray-500 text-sm mb-4">
                Join your union's agreement using the access code provided by your union rep.
              </p>
              <Link to="/join" className="btn-primary btn-sm">
                Join an Agreement
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {unionAgreements.map((a) => (
                <UnionAgreementRow key={a.id} agreement={a} />
              ))}
            </div>
          )}
        </section>

        {/* ── Uploaded Agreements Section ── */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Uploaded Agreements</h2>
              <p className="text-sm text-gray-500">PDFs you've uploaded and analyzed privately</p>
            </div>
            {!showUpload && (
              <button
                onClick={() => setShowUpload(true)}
                className="btn-secondary btn-sm"
              >
                + Upload Agreement
              </button>
            )}
          </div>

          {showUpload && (
            <div className="mb-4">
              <UploadFlow
                onComplete={() => { setShowUpload(false); refetch(); }}
                onCancel={() => setShowUpload(false)}
              />
            </div>
          )}

          {personalLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-perky-600 border-t-transparent" />
            </div>
          ) : !personalAgreements || personalAgreements.length === 0 ? (
            !showUpload && (
              <div className="card-brutal p-8 text-center">
                <div className="text-3xl mb-3">📄</div>
                <h3 className="font-semibold text-gray-900 mb-1">No agreements uploaded</h3>
                <p className="text-gray-500 text-sm mb-4">
                  If your union isn't on Perky yet, upload your collective agreement PDF and we'll
                  use AI to extract your benefits.
                </p>
                <button onClick={() => setShowUpload(true)} className="btn-secondary btn-sm">
                  Upload Your First Agreement
                </button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {personalAgreements.map((a) => (
                <AgreementRow key={a.id} agreement={a} onDelete={() => refetch()} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

// ── Union Agreement Row ──────────────────────────────────────────
function UnionAgreementRow({ agreement }: { agreement: MemberAgreementView }) {
  const leave = useLeaveAgreement();

  const handleLeave = async () => {
    if (
      !confirm(
        `Leave "${agreement.title}"?\n\nYou'll lose access to these benefits on your dashboard. You can re-join anytime with an access code.`
      )
    )
      return;
    try {
      await leave.mutateAsync(agreement.id);
    } catch {
      alert('Failed to leave agreement. Please try again.');
    }
  };

  return (
    <div className="card-brutal p-5">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs font-semibold text-perky-600 uppercase tracking-wide mb-1">
            {agreement.union_name}
          </div>
          <h3 className="font-semibold text-gray-900">{agreement.title}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-brutal bg-green-100 text-green-800">
              {agreement.benefit_count} benefit{agreement.benefit_count !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-400">
              Joined {new Date(agreement.joined_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={handleLeave}
          disabled={leave.isPending}
          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 flex-shrink-0"
        >
          {leave.isPending ? 'Leaving...' : 'Leave'}
        </button>
      </div>
    </div>
  );
}

// ── Agreement Row ───────────────────────────────────────────────
function AgreementRow({
  agreement,
  onDelete,
}: {
  agreement: {
    id: string;
    title: string;
    status: string;
    document_url: string | null;
    benefit_count: number;
    created_at: string;
  };
  onDelete: () => void;
}) {
  const deleteAgreement = useDeletePersonalAgreement();
  const [showExtract, setShowExtract] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${agreement.title}" and all its benefits? This cannot be undone.`)) return;
    try {
      await deleteAgreement.mutateAsync(agreement.id);
      onDelete();
    } catch {
      alert('Failed to delete agreement');
    }
  };

  return (
    <div className="card-brutal p-5">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900">{agreement.title}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-brutal ${
                agreement.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {agreement.benefit_count} benefit{agreement.benefit_count !== 1 ? 's' : ''}
            </span>
            {agreement.document_url && (
              <span className="text-xs text-gray-400">PDF uploaded</span>
            )}
            <span className="text-xs text-gray-400">
              Added {new Date(agreement.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {agreement.document_url && agreement.benefit_count === 0 && (
            <button
              onClick={() => setShowExtract(!showExtract)}
              className="text-sm text-perky-600 hover:text-perky-700 font-medium"
            >
              Extract Benefits
            </button>
          )}
          {agreement.document_url && agreement.benefit_count > 0 && (
            <button
              onClick={() => setShowExtract(!showExtract)}
              className="text-sm text-perky-600 hover:text-perky-700"
            >
              Re-extract
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleteAgreement.isPending}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {deleteAgreement.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {showExtract && (
        <div className="mt-4 border-t pt-4">
          <ExtractFlow
            agreementId={agreement.id}
            onComplete={() => {
              setShowExtract(false);
              onDelete(); // triggers refetch
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Upload Flow (new agreement) ─────────────────────────────────
function UploadFlow({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [isRateLimit, setIsRateLimit] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [agreementId, setAgreementId] = useState('');
  const [extractedBenefits, setExtractedBenefits] = useState<ExtractedBenefit[]>([]);
  const [titleSuggestion, setTitleSuggestion] = useState('');
  const [summary, setSummary] = useState('');
  const [analyzeSeconds, setAnalyzeSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = usePersonalUpload();
  const extract = usePersonalExtract();
  const accept = usePersonalAccept();

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
      // Phase 1: Upload
      setPhase('uploading');
      const result = await upload.mutateAsync({ file: selectedFile });
      const newAgreementId = result.data.agreementId;
      setAgreementId(newAgreementId);

      // Phase 2: Extract
      setPhase('analyzing');
      startTimer();
      const extraction = await extract.mutateAsync(newAgreementId);
      stopTimer();

      setExtractedBenefits(extraction.benefits);
      setTitleSuggestion(extraction.agreement_title_suggestion || '');
      setSummary(extraction.raw_summary || '');
      setPhase('review');
    } catch (err) {
      stopTimer();
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setIsRateLimit(msg.toLowerCase().includes('rate limit') || msg.includes('429'));
      setError(msg);
      setPhase('idle');
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
    const selected = extractedBenefits.filter((b) => !(b as any)._excluded);
    if (selected.length === 0) {
      setError('Select at least one benefit');
      return;
    }

    setError('');
    try {
      await accept.mutateAsync({
        agreementId,
        benefits: selected,
        title: titleSuggestion || undefined,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  // ── Phase Indicator ─────────
  const PhaseIndicator = () => {
    if (phase === 'idle') return null;
    const currentIndex = PHASE_STEPS.findIndex((p) => p.key === phase);

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {PHASE_STEPS.map((p, i) => {
            const isActive = p.key === phase;
            const isComplete = i < currentIndex;

            return (
              <div key={p.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isComplete
                        ? 'bg-perky-600 text-white'
                        : isActive
                        ? 'bg-perky-600 text-white ring-4 ring-perky-100'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isComplete ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 font-medium ${
                      isActive ? 'text-perky-700' : isComplete ? 'text-gray-600' : 'text-gray-400'
                    }`}
                  >
                    {p.label}
                  </span>
                </div>
                {i < PHASE_STEPS.length - 1 && (
                  <div className="flex-1 mx-2 mt-[-12px]">
                    <div className={`h-0.5 ${i < currentIndex ? 'bg-perky-600' : 'bg-gray-200'}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Uploading ─────────
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

  // ── Analyzing ─────────
  if (phase === 'analyzing') {
    return (
      <div className="card-brutal p-6">
        <PhaseIndicator />
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-perky-600 border-t-transparent mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-1">AI is Analyzing Your Document</h3>
          <p className="text-sm text-gray-500 mb-3">
            Reading the agreement and identifying all benefits...
          </p>
          <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-brutal">
            <div className="w-2 h-2 bg-perky-500 rounded-brutal animate-pulse" />
            <span className="text-sm text-gray-600 font-mono">
              {Math.floor(analyzeSeconds / 60)}:{String(analyzeSeconds % 60).padStart(2, '0')}
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-xs text-gray-400">Large documents (100+ pages) can take 60-90 seconds</p>
            <p className="text-xs text-gray-400">Please keep this page open</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Review ─────────
  if (phase === 'review') {
    return (
      <div className="card-brutal p-6">
        <PhaseIndicator />
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Review Extracted Benefits</h3>
            <p className="text-sm text-gray-500">
              Found {extractedBenefits.length} benefits. Review, edit, or uncheck to exclude.
            </p>
          </div>
        </div>

        {summary && (
          <div className="bg-blue-50 rounded-brutal p-3 mb-4 text-sm text-blue-800">
            <strong>AI Summary:</strong> {summary}
          </div>
        )}

        {titleSuggestion && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Agreement Title</label>
            <input
              value={titleSuggestion}
              onChange={(e) => setTitleSuggestion(e.target.value)}
              className="input-brutal text-sm"
            />
          </div>
        )}

        <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto">
          {extractedBenefits.map((benefit, index) => {
            const excluded = (benefit as any)._excluded;
            return (
              <div
                key={index}
                className={`border-3 border-ink rounded-brutal p-4 transition-opacity ${
                  excluded ? 'opacity-40 bg-gray-50' : 'bg-perky-50/30'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={!excluded}
                    onChange={() => toggleBenefit(index)}
                    className="rounded border-gray-300 text-perky-600 focus:ring-perky-500"
                  />
                  <span className="font-medium text-gray-900">{benefit.name}</span>
                </label>

                {!excluded && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="col-span-2">
                      <input
                        value={benefit.name}
                        onChange={(e) => updateBenefit(index, 'name', e.target.value)}
                        placeholder="Name"
                        className="input-brutal w-full text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        value={benefit.description || ''}
                        onChange={(e) => updateBenefit(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="input-brutal w-full text-sm"
                      />
                    </div>
                    <select
                      value={benefit.category}
                      onChange={(e) => updateBenefit(index, 'category', e.target.value)}
                      className="select-brutal text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <select
                      value={benefit.unit_type}
                      onChange={(e) => updateBenefit(index, 'unit_type', e.target.value)}
                      className="select-brutal text-sm"
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
                      className="input-brutal text-sm"
                    />
                    <select
                      value={benefit.period}
                      onChange={(e) => updateBenefit(index, 'period', e.target.value)}
                      className="select-brutal text-sm"
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
                        className="input-brutal w-full text-sm"
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
            onClick={onCancel}
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={accept.isPending}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {accept.isPending
              ? 'Saving...'
              : `Add ${extractedBenefits.filter((b) => !(b as any)._excluded).length} Benefits`}
          </button>
        </div>
      </div>
    );
  }

  // ── Idle: file selection ─────────
  return (
    <div className="card-brutal border-dashed p-6">
      <div className="text-center">
        <div className="text-3xl mb-2">📄</div>
        <h3 className="font-semibold text-gray-900 mb-1">Upload Collective Agreement</h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload a PDF and we'll use AI to extract your benefits automatically
        </p>

        {error && (
          <div
            className={`rounded-brutal p-3 mb-4 text-sm ${
              isRateLimit
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {isRateLimit ? (
              <>
                <strong>Rate limit reached.</strong> Large documents use many AI tokens. Please wait{' '}
                <strong>1-2 minutes</strong> then try again.
              </>
            ) : (
              error
            )}
          </div>
        )}

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
              disabled={upload.isPending || extract.isPending}
              className="btn-primary btn-sm disabled:opacity-50"
            >
              Upload & Extract Benefits
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Large documents (100+ pages) may take 60-90 seconds to analyze
            </p>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-primary btn-sm mb-2"
          >
            Choose PDF File
          </button>
        )}

        <div className="mt-3">
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Extract Flow (for existing agreement) ───────────────────────
function ExtractFlow({
  agreementId,
  onComplete,
}: {
  agreementId: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'review'>('idle');
  const [error, setError] = useState('');
  const [isRateLimit, setIsRateLimit] = useState(false);
  const [extractedBenefits, setExtractedBenefits] = useState<ExtractedBenefit[]>([]);
  const [titleSuggestion, setTitleSuggestion] = useState('');
  const [summary, setSummary] = useState('');
  const [analyzeSeconds, setAnalyzeSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const extract = usePersonalExtract();
  const accept = usePersonalAccept();

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

  const handleExtract = async () => {
    setError('');
    setIsRateLimit(false);
    try {
      setPhase('analyzing');
      startTimer();
      const result = await extract.mutateAsync(agreementId);
      stopTimer();
      setExtractedBenefits(result.benefits);
      setTitleSuggestion(result.agreement_title_suggestion || '');
      setSummary(result.raw_summary || '');
      setPhase('review');
    } catch (err) {
      stopTimer();
      const msg = err instanceof Error ? err.message : 'Extraction failed';
      setIsRateLimit(msg.toLowerCase().includes('rate limit') || msg.includes('429'));
      setError(msg);
      setPhase('idle');
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
    const selected = extractedBenefits.filter((b) => !(b as any)._excluded);
    if (selected.length === 0) {
      setError('Select at least one benefit');
      return;
    }
    setError('');
    try {
      await accept.mutateAsync({
        agreementId,
        benefits: selected,
        title: titleSuggestion || undefined,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  if (phase === 'analyzing') {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-perky-600 border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-2">AI is analyzing the document...</p>
        <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-brutal">
          <div className="w-2 h-2 bg-perky-500 rounded-brutal animate-pulse" />
          <span className="text-xs text-gray-600 font-mono">
            {Math.floor(analyzeSeconds / 60)}:{String(analyzeSeconds % 60).padStart(2, '0')}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Large documents can take 60-90 seconds</p>
      </div>
    );
  }

  if (phase === 'review') {
    return (
      <div>
        <div className="flex justify-between items-start mb-3">
          <p className="text-sm text-gray-600">
            Found {extractedBenefits.length} benefits. This will replace existing benefits.
          </p>
        </div>

        {summary && (
          <div className="bg-blue-50 rounded-brutal p-3 mb-3 text-sm text-blue-800">
            <strong>AI Summary:</strong> {summary}
          </div>
        )}

        <div className="space-y-2 mb-3 max-h-[40vh] overflow-y-auto">
          {extractedBenefits.map((benefit, index) => {
            const excluded = (benefit as any)._excluded;
            return (
              <div
                key={index}
                className={`border-3 border-ink rounded-brutal p-3 ${
                  excluded ? 'opacity-40 bg-gray-50' : 'bg-perky-50/30'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!excluded}
                    onChange={() => toggleBenefit(index)}
                    className="rounded border-gray-300 text-perky-600"
                  />
                  <span className="font-medium text-sm text-gray-900">{benefit.name}</span>
                  <span className="text-xs text-gray-500">
                    {benefit.limit_amount ? `${benefit.limit_amount} ${benefit.unit_type}` : 'Unlimited'} / {benefit.period.replace('per_', '')}
                  </span>
                </label>

                {!excluded && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      value={benefit.name}
                      onChange={(e) => updateBenefit(index, 'name', e.target.value)}
                      className="input-brutal col-span-2 text-sm"
                    />
                    <select
                      value={benefit.category}
                      onChange={(e) => updateBenefit(index, 'category', e.target.value)}
                      className="select-brutal text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <select
                      value={benefit.unit_type}
                      onChange={(e) => updateBenefit(index, 'unit_type', e.target.value)}
                      className="select-brutal text-sm"
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
                      placeholder="Limit"
                      className="input-brutal text-sm"
                    />
                    <select
                      value={benefit.period}
                      onChange={(e) => updateBenefit(index, 'period', e.target.value)}
                      className="select-brutal text-sm"
                    >
                      {PERIODS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onComplete}
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={accept.isPending}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {accept.isPending
              ? 'Saving...'
              : `Save ${extractedBenefits.filter((b) => !(b as any)._excluded).length} Benefits`}
          </button>
        </div>
      </div>
    );
  }

  // Idle
  return (
    <div>
      {error && (
        <div
          className={`rounded-brutal p-3 mb-3 text-sm ${
            isRateLimit
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {isRateLimit ? (
            <>
              <strong>Rate limit reached.</strong> Wait 1-2 minutes and try again.
            </>
          ) : (
            error
          )}
        </div>
      )}
      <button
        onClick={handleExtract}
        className="btn-primary btn-sm"
      >
        {isRateLimit ? 'Retry Extraction' : 'Extract Benefits with AI'}
      </button>
    </div>
  );
}
