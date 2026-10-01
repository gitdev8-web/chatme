/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginViewProps {
  onSwitchToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister }) => {
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginWithEmail(email.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in';
      if (
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/user-not-found') ||
        msg.includes('auth/wrong-password')
      ) {
        setError('Incorrect email or password. Please verify your credentials.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0c1317] text-[#e9edef] select-none relative px-4 py-8 overflow-y-auto">
      {/* Authentic Subtle Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-[#00a884]/10 rounded-full blur-[140px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[400px] my-auto">
        {/* Brand Header */}
        <div className="text-center mb-7 animate-in fade-in duration-300">
          <div className="inline-flex items-center justify-center mb-3.5">
            <img
              src="/logo.png"
              alt="DEV CHAT"
              className="h-16 w-16 rounded-2xl shadow-xl shadow-[#00a884]/25 object-cover border border-[#00a884]/30"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            DEV CHAT
          </h1>
          <p className="text-xs text-[#8696a0] mt-1.5 font-normal">
            Private, real-time messaging for developers & teams
          </p>
        </div>

        {/* Clean, Realistic Authentication Card */}
        <div className="rounded-2xl border border-[#222d34] bg-[#111b21] p-6 sm:p-7 shadow-2xl shadow-black/60">
          {/* Segmented Mode Selector */}
          <div className="flex items-center rounded-xl bg-[#202c33] p-1 border border-[#222d34] mb-6">
            <button
              type="button"
              className="flex-1 rounded-lg bg-[#00a884] py-2 text-xs font-semibold text-[#111b21] shadow-sm transition"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="flex-1 rounded-lg py-2 text-xs font-medium text-[#8696a0] hover:text-white transition"
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-white text-xs font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#8696a0] block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#8696a0]">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-[#00a884] hover:underline transition font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-white transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-[#111b21] shadow-md hover:bg-[#06cf9c] active:scale-[0.98] transition disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Footer Switcher */}
          <div className="mt-5 pt-4 border-t border-[#222d34]/70 text-center text-xs text-[#8696a0]">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-[#00a884] font-medium hover:underline transition ml-1"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#8696a0]">
          <Shield className="h-3.5 w-3.5 text-[#00a884]" />
          <span>End-to-end encrypted • Private & secure</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        defaultEmail={email}
      />
    </div>
  );
};
