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
  Phone,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { Realistic3DIcon } from '../common/Realistic3DIcon';

interface LoginViewProps {
  onSwitchToRegister: () => void;
  onSwitchToPhone?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSwitchToRegister,
  onSwitchToPhone,
}) => {
  const { loginWithEmail, loginWithGoogle, resetPassword, demoPhoneLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { showToast } = useToast();

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
      } else if (msg.includes('auth/unauthorized-domain')) {
        setError(
          'This domain is not yet authorized in Firebase Console. Add your domain in Firebase Authentication > Settings > Authorized domains.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in cancelled or failed';
      if (msg.includes('auth/unauthorized-domain')) {
        setError(
          'This domain is not yet authorized in Firebase Console. Add your domain in Firebase Authentication > Settings > Authorized domains.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInstantDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await demoPhoneLogin('+256700123456', 'Chattr Member');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      showToast('Password reset link sent to your email!', 'success');
      setShowForgotModal(false);
      setResetEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link';
      showToast(msg, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-start bg-[#0b141a] px-4 py-8 sm:py-12 relative overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#25d366]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#128c7e]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-2.5">
            <Realistic3DIcon name="whatsapp" size="xl" showDots={true} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e9edef] flex items-center justify-center gap-1.5">
            <span>Welcome to</span>
            <span className="text-[#25d366]">Chattr</span>
          </h1>
          <p className="mt-1 text-xs text-[#8696a0]">
            Fast, secure, real-time messaging across all devices
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-[#222d34] bg-[#111b21] p-5 sm:p-8 backdrop-blur-xl shadow-2xl">
          {error && (
            <div className="mb-5 flex flex-col gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleInstantDemo}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00a884] px-3 py-1.5 font-semibold text-white hover:bg-[#009374] transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Try Instant Demo Login</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
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
                  className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-4 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-[#25d366] hover:underline transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-10 pr-4 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#222d34] bg-[#202c33] text-[#25d366] focus:ring-[#25d366]/20"
                />
                <span className="text-xs text-[#8696a0]">Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#009374] disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In with Email</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Demo Login */}
          <button
            type="button"
            onClick={handleInstantDemo}
            disabled={loading}
            className="w-full mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-[#25d366]/40 bg-[#005c4b]/30 py-2.5 text-xs font-semibold text-[#25d366] hover:bg-[#005c4b]/50 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Instant 1-Click Demo Login</span>
          </button>

          {/* Social Sign-in Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#222d34]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#111b21] px-3 text-[#8696a0] tracking-wider">
                or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-[#222d34] bg-[#202c33] py-2.5 text-xs font-medium text-[#e9edef] hover:bg-[#2a3942] transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
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
            <span>{googleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>

          {/* Switch to Phone Auth */}
          {onSwitchToPhone && (
            <div className="mt-3.5 text-center">
              <button
                type="button"
                onClick={onSwitchToPhone}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#25d366] hover:underline transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Or sign in with Phone Number</span>
              </button>
            </div>
          )}

          {/* Switch to Register */}
          <div className="mt-4 text-center text-xs text-[#8696a0]">
            Don't have a Chattr account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="font-medium text-[#25d366] hover:underline transition"
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Footer PWA Install */}
        <div className="mt-5 flex justify-center">
          <PWAInstallButton />
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Password"
        subtitle="Enter your email to receive recovery instructions"
        maxWidth="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
              Registered Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-9 pr-3 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="flex-1 rounded-xl border border-[#222d34] py-2 text-xs font-medium text-[#8696a0] hover:bg-[#202c33] hover:text-[#e9edef] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetLoading}
              className="flex-1 rounded-xl bg-[#00a884] py-2 text-xs font-semibold text-white hover:bg-[#009374] disabled:opacity-50 transition"
            >
              {resetLoading ? 'Sending...' : 'Send Link'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
