import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Gem, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || 'Showroom Staff',
              role: 'staff',
            },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          navigate('/');
        } else {
          setMessage('Account created! Please check your email or proceed to sign in.');
          setIsSignUp(false);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (data.session) {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFBF7] via-[#FAF6EE] to-[#F3EDE0] flex items-center justify-center p-4 selection:bg-majestic-200">
      {/* Background luxury ornament accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-majestic-200/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-majestic-300/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-majestic-200">
        
        {/* Brand Emblem */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-majestic-900 via-majestic-700 to-majestic-500 p-[2px] shadow-lg">
            <div className="w-full h-full bg-majestic-950 rounded-[14px] flex items-center justify-center">
              <Gem className="w-8 h-8 text-majestic-300 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wider text-majestic-950 uppercase">
              Majestic
            </h1>
            <p className="text-xs font-semibold tracking-widest text-majestic-700 uppercase mt-0.5">
              Custom Jewellery Designer · Est. 1970
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-majestic-100 border border-majestic-300 text-majestic-900 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-majestic-700" /> Showroom Staff Portal
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Staff Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tariq Al-Majestic"
                  className="w-full pl-4 pr-4 py-3 rounded-xl border border-stone-300 focus:border-majestic-500 focus:ring-2 focus:ring-majestic-200 text-sm outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Staff Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@majesticjewellers.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:border-majestic-500 focus:ring-2 focus:ring-majestic-200 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Account Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:border-majestic-500 focus:ring-2 focus:ring-majestic-200 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-majestic-700 via-majestic-600 to-majestic-500 hover:from-majestic-800 hover:to-majestic-600 text-white font-serif font-bold text-sm tracking-wide shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isSignUp ? 'Create Staff Profile' : 'Enter Showroom Studio'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-200/80 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs text-majestic-800 hover:text-majestic-950 font-semibold hover:underline"
          >
            {isSignUp
              ? 'Already registered? Sign in here'
              : 'First time staff member? Register your staff account'}
          </button>
        </div>

        <p className="text-[11px] text-stone-400 text-center mt-6">
          Authorized Majestic Atelier personnel only. All generated designs and customer vector lettering are logged.
        </p>

      </div>
    </div>
  );
};
