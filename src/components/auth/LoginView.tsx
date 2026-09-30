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
  Eye,
  EyeOff,
  QrCode,
  Shield,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

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
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'qr' | 'email'
  const [activeTab, setActiveTab] = useState<'qr' | 'email'>('qr');

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
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInstantDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await demoPhoneLogin('+256700123456', 'DEV CHAT Developer');
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
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-[#0c1317] select-none relative overflow-x-hidden">
      {/* Authentic WhatsApp Web Top Green Strip */}
      <div className="h-56 w-full bg-[#00a884] fixed top-0 left-0 z-0 flex items-start pt-7 px-8 sm:px-16">
        <div className="max-w-5xl w-full mx-auto flex items-center gap-3 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#00a884] shadow-md">
            <MessageCircle className="h-5 w-5 fill-current" />
          </div>
          <span className="text-sm font-semibold tracking-wider uppercase">
            DEV CHAT WEB
          </span>
        </div>
      </div>

      {/* Main WhatsApp Web Card */}
      <div className="relative z-10 w-full max-w-4xl px-4 pt-24 pb-12 my-auto">
        <div className="rounded-2xl border border-[#222d34] bg-[#111b21] p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left Instructions Column */}
            <div className="space-y-6">
              <h1 className="text-xl sm:text-2xl font-light text-[#e9edef] leading-snug">
                To use <span className="font-semibold text-[#00a884]">DEV CHAT</span> on your computer:
              </h1>

              <ol className="space-y-4 text-xs sm:text-sm text-[#8696a0] list-decimal list-inside leading-relaxed">
                <li>
                  <span className="text-[#e9edef] font-medium">Open DEV CHAT</span> on your device
                </li>
                <li>
                  Tap <span className="text-[#e9edef] font-medium">1-Click Quick Demo</span> or sign in with your email
                </li>
                <li>
                  Enjoy real-time, <span className="text-[#00a884] font-medium">end-to-end encrypted</span> messaging
                </li>
              </ol>

              {/* Tab Selector */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setActiveTab('qr')}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    activeTab === 'qr'
                      ? 'bg-[#00a884] text-[#111b21] font-semibold'
                      : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
                  }`}
                >
                  Quick Scan / Demo
                </button>
                <button
                  onClick={() => setActiveTab('email')}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    activeTab === 'email'
                      ? 'bg-[#00a884] text-[#111b21] font-semibold'
                      : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
                  }`}
                >
                  Email & Password
                </button>
              </div>

              <div className="pt-2 text-[11px] text-[#8696a0] flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-[#00a884]" />
                <span>Protected by zero-trust Firestore database rules</span>
              </div>
            </div>

            {/* Right Interactive Box Column */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#202c33]/50 border border-[#222d34]">
              {error && (
                <div className="mb-4 w-full rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {activeTab === 'qr' ? (
                /* QR Code & 1-Click Demo Layout */
                <div className="flex flex-col items-center text-center space-y-4 w-full">
                  <div className="relative p-4 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                    {/* Simulated Authentic WhatsApp QR Code */}
                    <QrCode className="h-44 w-44 text-[#111b21]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white shadow-lg ring-4 ring-white">
                        <MessageCircle className="h-5 w-5 fill-current" />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#8696a0]">
                    Point your camera at this screen or use 1-click login
                  </p>

                  {/* 1-Click Demo Button */}
                  <button
                    onClick={handleInstantDemo}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00a884] px-4 py-3 text-xs font-bold text-[#111b21] shadow-lg hover:bg-[#06cf9c] transition active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{loading ? 'Connecting...' : '1-Click Instant Demo Login'}</span>
                  </button>

                  {/* Google Sign In */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#222d34] bg-[#202c33] px-4 py-2.5 text-xs font-semibold text-[#e9edef] hover:bg-[#2a3942] transition"
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
                    <span>{googleLoading ? 'Signing in...' : 'Sign in with Google'}</span>
                  </button>
                </div>
              ) : (
                /* Standard Email / Password Form */
                <form onSubmit={handleSubmit} className="w-full space-y-3.5">
                  <div>
                    <label className="text-xs text-[#8696a0] block mb-1">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        required
                        className="w-full rounded-xl border border-[#222d34] bg-[#111b21] pl-10 pr-4 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-[#8696a0]">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-[11px] text-[#00a884] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full rounded-xl border border-[#222d34] bg-[#111b21] pl-10 pr-10 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00a884] px-4 py-2.5 text-xs font-bold text-[#111b21] hover:bg-[#06cf9c] transition shadow-md disabled:opacity-50"
                  >
                    <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              {/* Bottom Switcher */}
              <div className="mt-4 pt-3 border-t border-[#222d34] w-full text-center">
                <span className="text-xs text-[#8696a0]">Don't have an account? </span>
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-xs font-bold text-[#00a884] hover:underline"
                >
                  Create one now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Lock End-to-end Encrypted */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#8696a0]">
          <Lock className="h-3.5 w-3.5" />
          <span>Your personal messages are end-to-end encrypted</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Password"
        subtitle="Enter your email to receive a password reset link"
        maxWidth="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] p-3 text-xs text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetLoading}
              className="rounded-xl bg-[#00a884] px-4 py-2 text-xs font-semibold text-[#111b21] hover:bg-[#06cf9c]"
            >
              {resetLoading ? 'Sending...' : 'Send Link'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
