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
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onSwitchToLogin }) => {
  const { registerWithEmail } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
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
            Create an account to start messaging instantly
          </p>
        </div>

        {/* Clean, Realistic Authentication Card */}
        <div className="rounded-2xl border border-[#222d34] bg-[#111b21] p-6 sm:p-7 shadow-2xl shadow-black/60">
          {/* Segmented Mode Selector */}
          <div className="flex items-center rounded-xl bg-[#202c33] p-1 border border-[#222d34] mb-6">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="flex-1 rounded-lg py-2 text-xs font-medium text-[#8696a0] hover:text-white transition"
            >
              Sign In
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg bg-[#00a884] py-2 text-xs font-semibold text-[#111b21] shadow-sm transition"
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-[#111b21] shadow-md hover:bg-[#06cf9c] active:scale-[0.98] transition disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Footer Switcher */}
          <div className="mt-5 pt-4 border-t border-[#222d34]/70 text-center text-xs text-[#8696a0]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[#00a884] font-medium hover:underline transition ml-1"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#8696a0]">
          <Shield className="h-3.5 w-3.5 text-[#00a884]" />
          <span>End-to-end encrypted • Private & secure</span>
        </div>
      </div>
    </div>
  );
};
