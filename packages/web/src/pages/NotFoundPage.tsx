import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function NotFoundPage() {
  return (
    <Layout>
      <div className="text-center py-20">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Page not found</h2>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="bg-perky-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-perky-700 inline-block"
        >
          Go to Dashboard
        </Link>
      </div>
    </Layout>
  );
}
