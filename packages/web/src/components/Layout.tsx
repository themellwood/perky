import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

function NavLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`text-sm font-medium px-2 py-1 transition-all ${
        isActive
          ? 'text-ink font-bold bg-perky-200 border-2 border-ink rounded-[4px]'
          : 'text-ink hover:bg-fight-100 rounded-[4px]'
      }`}
    >
      {children}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  const navLinks = (
    <>
      <NavLink to="/dashboard" onClick={closeMenu}>My Benefits</NavLink>
      <NavLink to="/my-agreements" onClick={closeMenu}>My Agreements</NavLink>
      <NavLink to="/directory" onClick={closeMenu}>Directory</NavLink>
      <NavLink to="/join" onClick={closeMenu}>Join</NavLink>
      {(user?.role === 'platform_admin' || user?.role === 'union_admin') && (
        <NavLink to="/admin" onClick={closeMenu}>Admin</NavLink>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-[#fafaf5]">
      <header className="bg-white border-b-3 border-ink sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-6">
              <Link to="/" className="inline-block">
                <span className="text-2xl font-bold text-ink bg-fight-500 px-2 py-0.5 border-2 border-ink rounded-[4px] inline-block -rotate-1">
                  Perky
                </span>
              </Link>
              {/* Desktop nav */}
              {user && (
                <nav className="hidden md:flex items-center gap-2">
                  {navLinks}
                </nav>
              )}
            </div>

            {user && (
              <div className="flex items-center gap-3">
                {/* Desktop user info */}
                <div className="hidden sm:flex items-center gap-3">
                  <Link to="/settings" className="text-sm font-medium text-ink hover:text-perky-700">
                    {user.name || user.email}
                  </Link>
                  <span className="badge-brutal bg-perky-200 text-perky-900">
                    {user.role.replace(/_/g, ' ')}
                  </span>
                  <Link to="/profile" className="text-sm text-gray-600 hover:text-ink">
                    My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-ink hover:text-red-600"
                  >
                    Sign out
                  </button>
                </div>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-ink border-3 border-ink rounded-brutal hover:bg-fight-100"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden border-t-3 border-ink bg-fight-50">
            <nav className="flex flex-col px-4 py-3 space-y-2">
              {navLinks}
              <hr className="border-t-2 border-ink/20" />
              <Link
                to="/settings"
                className="text-sm font-medium text-ink hover:text-perky-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>
              <Link
                to="/profile"
                className="text-sm text-gray-600 hover:text-ink"
                onClick={() => setMobileMenuOpen(false)}
              >
                My Profile
              </Link>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink/60">{user.email}</span>
                <span className="badge-brutal bg-perky-200 text-perky-900">
                  {user.role.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-left text-sm font-bold text-red-600 hover:text-red-800"
              >
                Sign out
              </button>
            </nav>
          </div>
        )}
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-h-[calc(100vh-10rem)]">
        {children}
      </main>
      <footer className="border-t-3 border-ink bg-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-300">
          <span className="font-medium">Perky &mdash; Know your rights. Use your rights.</span>
          <span>Built on Cloudflare</span>
        </div>
      </footer>
    </div>
  );
}
