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
  MessageCircle,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
  onSwitchToPhone?: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onSwitchToLogin,
  onSwitchToPhone,
}) => {
  const { registerWithEmail, loginWithGoogle, demoPhoneLogin } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const generatedUsername = `${displayName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 14)}_${Math.random().toString(36).substring(2, 6)}`;

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
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-up failed';
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInstantDemo = async () => {
    setError(null);
    setDemoLoading(true);
    try {
      await demoPhoneLogin('+256700123456', 'DEV CHAT Developer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setError(msg);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0b141a] text-[#e9edef] select-none relative px-4 py-8 overflow-y-auto">
      {/* Unique Ambient Emerald Glow in Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00a884]/15 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 w-[400px] h-[400px] bg-[#25d366]/10 rounded-full blur-[100px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[420px] my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6 animate-in fade-in duration-300">
          <div className="inline-flex items-center justify-center relative mb-3">
            <div className="absolute inset-0 rounded-2xl bg-[#00a884]/30 blur-lg animate-pulse" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00a884] to-[#008069] text-white shadow-xl shadow-[#00a884]/20 border border-[#25d366]/30">
              <MessageCircle className="h-8 w-8 fill-current" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            DEV CHAT
          </h1>
          <p className="text-xs text-[#8696a0] mt-1">
            Create an account to start messaging instantly
          </p>
        </div>

        {/* Clean Authentication Card */}
        <div className="rounded-3xl border border-[#222d34] bg-[#111b21]/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl shadow-black/80">
          {/* Segmented Mode Selector */}
          <div className="flex items-center rounded-2xl bg-[#202c33]/90 p-1 border border-[#222d34] mb-6">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="flex-1 rounded-xl py-2 text-xs font-medium text-[#8696a0] hover:text-white transition"
            >
              Sign In
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-[#00a884] py-2 text-xs font-bold text-[#111b21] shadow-sm transition"
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
            {/* Full Name */}
            <div>
              <label className="text-xs font-medium text-[#8696a0] block mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Morgan"
                  autoComplete="name"
                  className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
              </div>
            </div>

            {/* Email Address */}
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
                  placeholder="alex@domain.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-[#8696a0] block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
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

              {/* Minimalist Password Strength Meter */}
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
                  <span className="text-[10px] text-[#8696a0] font-medium ml-1">
                    {strength >= 3 ? 'Strong' : strength === 2 ? 'Fair' : 'Weak'}
                  </span>
                </div>
              )}
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-3 text-xs font-bold text-[#111b21] shadow-lg shadow-[#00a884]/20 hover:bg-[#06cf9c] active:scale-95 transition disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#222d34]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
              <span className="bg-[#111b21] px-2 text-[#8696a0]">or quick access</span>
            </div>
          </div>

          {/* Quick 1-Click Demo & Social Auth */}
          <div className="space-y-2.5">
            {/* 1-Click Instant Demo Button */}
            <button
              type="button"
              onClick={handleInstantDemo}
              disabled={demoLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-xs font-bold text-[#25d366] hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{demoLoading ? 'Starting demo session...' : '1-Click Instant Demo Login'}</span>
            </button>

            {/* Google Sign Up */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-[#222d34] bg-[#202c33] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2a3942] active:scale-95 transition disabled:opacity-50"
            >
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Connecting...' : 'Sign up with Google'}</span>
            </button>

            {/* Phone option if enabled */}
            {onSwitchToPhone && (
              <button
                type="button"
                onClick={onSwitchToPhone}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-[#8696a0] hover:text-white transition font-medium"
              >
                <Smartphone className="h-3.5 w-3.5 text-[#00a884]" />
                <span>Use phone number sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Security & Feature Micro Badges */}
        <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-[#8696a0]">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-[#00a884]" />
            <span>End-to-End Encrypted</span>
          </div>
          <span className="text-[#222d34]">•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#00a884]" />
            <span>Voice & Video Calls</span>
          </div>
        </div>
      </div>
    </div>
  );
};
