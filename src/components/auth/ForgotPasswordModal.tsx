/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setSent(false);
      setError(null);
    }
  }, [isOpen, defaultEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
      showToast('Password reset link sent', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email';
      if (msg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('auth/user-not-found')) {
        setError('No account was found with that email address.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Password"
      subtitle="Enter your email to receive a recovery link"
      maxWidth="sm"
    >
      {sent ? (
        <div className="text-center py-4 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#00a884]/15 text-[#00a884]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-[#e9edef]">Check your inbox</h4>
          <p className="text-xs text-[#8696a0] leading-relaxed">
            We sent password reset instructions to{' '}
            <strong className="text-[#e9edef]">{email}</strong>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full min-h-[44px] rounded-xl bg-[#202c33] py-2.5 text-xs font-semibold text-[#e9edef] hover:bg-[#2a3942] transition"
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="reset-email" className="text-xs font-medium text-[#8696a0] block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
              <input
                id="reset-email"
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

          <button
            type="submit"
            disabled={loading}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-sm font-semibold text-[#0b141a] shadow-md hover:bg-[#06cf9c] disabled:opacity-50 transition cursor-pointer"
          >
            <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      )}
    </Modal>
  );
};
