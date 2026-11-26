/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  LockKeyhole,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GoogleSignInButton } from './GoogleSignInButton';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
  registrationOpen?: boolean;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onSwitchToLogin,
  registrationOpen = true,
}) => {
  const { registerWithEmail, loginWithGoogle } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (!msg.includes('auth/popup-closed-by-user')) {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const baseHandle = displayName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 14) || 'user';
      const generatedUsername = `${baseHandle}_${Math.random().toString(36).substring(2, 6)}`;

      await registerWithEmail(
        email.trim(),
        password,
        displayName.trim(),
        generatedUsername,
        '',
        'Hey there! I am using DEV CHAT.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (msg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password is too weak. Please use at least 6 characters.');
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
            Create your account
          </h1>
          <p className="text-xs text-[#8696a0] mt-1.5">
            Join DEV CHAT in seconds to message and call freely.
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

          {!registrationOpen && (
            <div className="mb-5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
              <LockKeyhole className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">New registrations are paused</p>
                <p className="text-[11px] opacity-85 mt-0.5">
                  Please sign in with an existing account or check back later.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="text-xs font-medium text-[#8696a0] block mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  id="register-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Morgan"
                  autoComplete="name"
                  className="w-full min-h-[44px] rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-4 py-2.5 text-[15px] sm:text-sm text-[#e9edef] placeholder:text-[#8696a0]/70 focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="text-xs font-medium text-[#8696a0] block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@domain.com"
                  autoComplete="email"
                  className="w-full min-h-[44px] rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-4 py-2.5 text-[15px] sm:text-sm text-[#e9edef] placeholder:text-[#8696a0]/70 focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="text-xs font-medium text-[#8696a0] block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
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

              {password.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        step <= strength
                          ? strength >= 3
                            ? 'bg-[#00a884]'
                            : strength === 2
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                          : 'bg-[#202c33]'
                      }`}
                    />
                  ))}
                  <span className="text-[11px] text-[#8696a0] font-medium ml-1 tabular-nums">
                    {strength >= 3 ? 'Strong' : strength === 2 ? 'Fair' : 'Weak'}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading || !registrationOpen}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 px-4 text-sm font-semibold text-[#0b141a] shadow-md hover:bg-[#06cf9c] active:scale-[0.99] transition disabled:opacity-50 mt-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]"
            >
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {registrationOpen && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#222d34]" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#8696a0]">or</span>
                <div className="h-px flex-1 bg-[#222d34]" />
              </div>

              <GoogleSignInButton
                onClick={handleGoogleSignIn}
                loading={googleLoading}
                disabled={loading}
              />
            </>
          )}

          <div className="mt-5 pt-4 border-t border-[#222d34]/80 text-center text-xs text-[#8696a0]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[#00a884] font-semibold hover:underline transition ml-0.5 py-1 px-1"
            >
              Sign in
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#8696a0]">
          <Shield className="h-3.5 w-3.5 text-[#00a884]" />
          <span>End-to-end encrypted · DEV CHAT</span>
        </div>
      </main>
    </div>
  );
};
