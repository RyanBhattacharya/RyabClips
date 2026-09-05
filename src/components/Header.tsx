import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="RyabClips" className="w-8 h-8" />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-white">Ryab</span>
            <span className="text-yellow">Clips</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 font-medium tracking-wide uppercase">Made By Ryab</span>
        </div>
      </div>
    </header>
  );
}
