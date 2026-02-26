import { Link } from 'react-router-dom';

export function PublicNav() {
  return (
    <header className="bg-white border-b-3 border-ink sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <Link to="/" className="inline-block">
            <span className="text-2xl font-bold text-ink bg-fight-500 px-2 py-0.5 border-2 border-ink rounded-[4px] inline-block -rotate-1">
              Perky
            </span>
          </Link>
          <Link to="/login" className="text-sm font-bold text-ink hover:text-perky-700">
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
