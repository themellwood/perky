import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useAgreement, usePublishAgreement } from '../../hooks/useAgreements';
import { useBenefits, useCreateBenefit, useUpdateBenefit, useDeleteBenefit } from '../../hooks/useBenefits';
import { BenefitCard } from '../../components/BenefitCard';
import { DocumentUpload } from '../../components/DocumentUpload';

export function AgreementEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: agreement, refetch: refetchAgreement } = useAgreement(id!);
  const { data: benefits, refetch: refetchBenefits } = useBenefits(id!);
  const publishAgreement = usePublishAgreement();
  const createBenefit = useCreateBenefit();
  const updateBenefit = useUpdateBenefit();
  const deleteBenefit = useDeleteBenefit();

  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [copied, setCopied] = useState(false);

  const handlePublish = async () => {
    setPublishError('');
    try {
      await publishAgreement.mutateAsync(id!);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const copyCode = () => {
    if ((agreement as any)?.access_code) {
      navigator.clipboard.writeText((agreement as any).access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!agreement) return <Layout><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perky-600" /></Layout>;

  const a = agreement as any;

  return (
    <Layout>
      <div className="mb-6">
        <Link to={`/admin/unions/${a.union_id}`} className="text-sm text-perky-600 hover:text-perky-700">&larr; Back to union</Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{a.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                a.status === 'published' ? 'bg-green-100 text-green-800' :
                a.status === 'public_approved' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {a.status}
              </span>
              {a.access_code && (
                <button onClick={copyCode} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                  {a.access_code}
                  <span className="text-xs">{copied ? '✓' : '📋'}</span>
                </button>
              )}
              {a.document_url && (
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                  PDF uploaded
                </span>
              )}
            </div>
          </div>
          {a.status === 'draft' && (
            <button
              onClick={handlePublish}
              disabled={publishAgreement.isPending || !benefits?.length}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishAgreement.isPending ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
        {publishError && <p className="text-sm text-red-600 mt-2">{publishError}</p>}
      </div>

      {/* Document Upload & AI Extraction */}
      {showUpload ? (
        <div className="mb-6">
          <DocumentUpload
            agreementId={id!}
            hasDocument={!!a.document_url}
            onComplete={() => {
              setShowUpload(false);
              refetchAgreement();
              refetchBenefits();
            }}
          />
        </div>
      ) : (
        <div className="mb-6">
          <button
            onClick={() => setShowUpload(true)}
            className="w-full border-3 border-ink border-dashed rounded-brutal p-4 text-center hover:border-perky-400 hover:bg-perky-50/30 transition-colors"
          >
            <span className="text-sm text-gray-600">
              {a.document_url
                ? '📄 Re-extract benefits from uploaded PDF'
                : '📄 Upload PDF & extract benefits with AI'}
            </span>
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Benefits ({benefits?.length || 0})</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn-primary text-sm"
        >
          Add Benefit
        </button>
      </div>

      {showAdd && (
        <BenefitCard
          mode="create"
          agreementId={id!}
          onSave={async (data) => {
            await createBenefit.mutateAsync({ agreementId: id!, ...data });
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {benefits?.length === 0 && !showAdd ? (
        <div className="text-center py-12 card-brutal">
          <p className="text-gray-500 mb-2">No benefits added yet</p>
          <p className="text-sm text-gray-400 mb-3">Upload a PDF above to extract benefits, or add them manually</p>
          <button onClick={() => setShowAdd(true)} className="text-perky-600 hover:text-perky-700 text-sm">
            Add a benefit manually
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {benefits?.map((b: any) => (
            <BenefitCard
              key={b.id}
              benefit={b}
              mode="edit"
              agreementId={id!}
              onSave={async (data) => {
                await updateBenefit.mutateAsync({ id: b.id, agreementId: id!, ...data });
              }}
              onDelete={async () => {
                await deleteBenefit.mutateAsync({ id: b.id, agreementId: id! });
              }}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
