// Login Form
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Lock, User, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const LoginForm: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please fill in both email/username and password.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md mb-3">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to TalkTime</h2>
        <p className="text-sm text-slate-500 mt-1">Sign in to your TalkTime account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email or Username</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="login-identifier-input"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. johndoe or john@talktime.app"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="login-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              required
            />
          </div>
        </div>

        <button
          id="login-submit-btn"
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
        Don&apos;t have an account?{' '}
        <button
          id="switch-to-register-btn"
          onClick={onSwitchToRegister}
          className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
        >
          Create account
        </button>
      </div>
    </div>
  );
};
