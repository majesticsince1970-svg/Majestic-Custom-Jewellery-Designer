import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Profile } from './types';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { NewDesign } from './pages/NewDesign';
import { Results } from './pages/Results';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Loader2 } from 'lucide-react';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  user: any;
  profile: Profile | null;
  requireAdmin?: boolean;
}> = ({ children, user, profile, requireAdmin }) => {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.warn('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-majestic-600" />
        <p className="font-serif text-sm font-bold text-stone-800">
          Loading Majestic Showroom Atelier...
        </p>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
        {session && <Header profile={profile} onLogout={() => { setSession(null); setProfile(null); }} />}
        
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute user={session?.user} profile={profile}>
                  <NewDesign />
                </ProtectedRoute>
              }
            />

            <Route
              path="/results/:requestId"
              element={
                <ProtectedRoute user={session?.user} profile={profile}>
                  <Results />
                </ProtectedRoute>
              }
            />

            <Route
              path="/history"
              element={
                <ProtectedRoute user={session?.user} profile={profile}>
                  <History />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute user={session?.user} profile={profile} requireAdmin={true}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
