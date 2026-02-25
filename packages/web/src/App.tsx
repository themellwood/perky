import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { PartnersPage } from './pages/PartnersPage';
import { LoginPage } from './pages/LoginPage';
import { VerifyPage } from './pages/VerifyPage';
import { DashboardPage } from './pages/DashboardPage';
import { JoinPage } from './pages/JoinPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { MyAgreementsPage } from './pages/MyAgreementsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { BenefitDetailPage } from './pages/BenefitDetailPage';
import { PlatformAdminPage } from './pages/admin/PlatformAdminPage';
import { UnionDetailPage } from './pages/admin/UnionDetailPage';
import { AgreementEditorPage } from './pages/admin/AgreementEditorPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/verify" element={<VerifyPage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/join"
          element={
            <ProtectedRoute>
              <JoinPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-agreements"
          element={
            <ProtectedRoute>
              <MyAgreementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/benefits/:id"
          element={
            <ProtectedRoute>
              <BenefitDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <PlatformAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/unions/:unionId"
          element={
            <ProtectedRoute>
              <UnionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/unions/:unionId/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/agreements/:id"
          element={
            <ProtectedRoute>
              <AgreementEditorPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
