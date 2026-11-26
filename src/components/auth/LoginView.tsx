/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';
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
        setError('Incorrect email or password. Please check your details and try again.');
      } else if (msg.includes('auth/too-many-requests')) {
        setError('Too many attempts. Please wait a moment before trying again.');
      } else if (msg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('auth/network-request-failed')) {
        setError('Network error. Check your internet connection and retry.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#0c1317] text-[#e9edef] select-none relative px-4 py-8 overflow-y-auto">
      {/* Subtle Ambient Accent */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-full max-w-xl h-56 bg-[#00a884]/10 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 w-full max-w-[400px] my-auto animate-in fade-in">
        {/* Clean Brand Header */}
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="DEV CHAT"
            className="mx-auto mb-3.5 h-14 w-14 rounded-2xl shadow-lg shadow-[#00a884]/20 object-cover border border-[#00a884]/30"
          />
          <h1 className="text-2xl font-bold tracking-tight text-[#e9edef] text-balance">
            Sign in to DEV CHAT
          </h1>
          <p className="text-xs text-[#8696a0] mt-1.5">
            Welcome back. Enter your details to continue.
          </p>
        </div>

        {/* Focused Auth Card */}
        <div className="rounded-2xl border border-[#222d34] bg-[#111b21] p-6 sm:p-7 shadow-xl shadow-black/40">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-3 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <p className="flex-1 leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                className="text-rose-400 hover:text-[#e9edef] text-sm leading-none px-1"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="text-xs font-medium text-[#8696a0] block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full min-h-[44px] rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-4 py-2.5 text-[15px] sm:text-sm text-[#e9edef] placeholder:text-[#8696a0]/70 focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-xs font-medium text-[#8696a0]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-[#00a884] hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884] rounded px-1 py-0.5"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full min-h-[44px] rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-11 py-2.5 text-[15px] sm:text-sm text-[#e9edef] placeholder:text-[#8696a0]/70 focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-[#8696a0] hover:text-[#e9edef] transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 px-4 text-sm font-semibold text-[#0b141a] shadow-md hover:bg-[#06cf9c] active:scale-[0.99] transition disabled:opacity-50 mt-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#222d34]/80 text-center text-xs text-[#8696a0]">
            New to DEV CHAT?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-[#00a884] font-semibold hover:underline transition ml-0.5 py-1 px-1"
            >
              Create account
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#8696a0]">
          <Shield className="h-3.5 w-3.5 text-[#00a884]" />
          <span>End-to-end encrypted · DEV CHAT</span>
        </div>
      </main>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        defaultEmail={email}
      />
    </div>
  );
};
