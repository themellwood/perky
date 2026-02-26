import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const { verify, isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);
  const token = searchParams.get('token');
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setError('No token provided');
      setVerifying(false);
      return;
    }

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    verify(token)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Verification failed');
      })
      .finally(() => setVerifying(false));
  }, [token, verify]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-perky-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Verifying your sign-in link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf5]">
        <div className="max-w-md w-full card-brutal p-8 shadow-brutal-lg text-center">
          <div className="w-12 h-12 bg-red-200 rounded-brutal border-3 border-ink flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-ink mb-2">Sign-in failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/login"
            className="btn-primary inline-block"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return null;
}
