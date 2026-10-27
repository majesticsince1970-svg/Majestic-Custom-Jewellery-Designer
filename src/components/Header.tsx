import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, History as HistoryIcon, Settings as SettingsIcon, LogOut, Gem, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface HeaderProps {
  profile?: Profile | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ profile, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (onLogout) onLogout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-majestic-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & Tagline */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-majestic-800 via-majestic-600 to-majestic-400 p-[1.5px] shadow-md group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-majestic-950 rounded-[10px] flex items-center justify-center">
                <Gem className="w-5 h-5 text-majestic-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-wider text-majestic-950 uppercase">
                  Majestic
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-majestic-100 text-majestic-800 border border-majestic-300">
                  SINCE 1970
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium tracking-wide">
                Custom Jewellery Designer · Showroom Studio
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/')
                  ? 'bg-majestic-100 text-majestic-900 border border-majestic-300 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-majestic-800 hover:bg-majestic-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-majestic-600" />
              New Design
            </Link>

            <Link
              to="/history"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/history')
                  ? 'bg-majestic-100 text-majestic-900 border border-majestic-300 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-majestic-800 hover:bg-majestic-50'
              }`}
            >
              <HistoryIcon className="w-4 h-4 text-majestic-600" />
              History
            </Link>

            {profile?.role === 'admin' && (
              <Link
                to="/settings"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/settings')
                    ? 'bg-majestic-100 text-majestic-900 border border-majestic-300 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-majestic-800 hover:bg-majestic-50'
                }`}
              >
                <SettingsIcon className="w-4 h-4 text-majestic-600" />
                Settings
              </Link>
            )}
          </nav>

          {/* User profile & actions */}
          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-majestic-50 border border-majestic-200">
                <div className="w-7 h-7 rounded-full bg-majestic-200 text-majestic-900 flex items-center justify-center font-bold text-xs uppercase">
                  {profile.full_name?.charAt(0) || 'S'}
                </div>
                <div className="text-left text-xs">
                  <p className="font-semibold text-stone-800 truncate max-w-[120px]">
                    {profile.full_name || 'Staff User'}
                  </p>
                  <p className="text-[10px] text-majestic-700 capitalize font-medium">
                    {profile.role}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2.5 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

