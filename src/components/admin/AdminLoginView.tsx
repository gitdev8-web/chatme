/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Shield,
  Lock,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { useToast } from '../common/Toast';
import { auth } from '../../firebase/config';
import { signInAnonymously } from 'firebase/auth';

interface AdminLoginViewProps {
  onSuccess: () => void;
  onReturnToApp: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onSuccess,
  onReturnToApp,
}) => {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password.trim()) {
      setErrorMessage('Please enter the administrative security password.');
      return;
    }

    setLoading(true);
    try {
      if (password.trim() === 'Percentage') {
        // Guarantee Firebase session to prevent Firestore permissions errors
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        sessionStorage.setItem('admin_authenticated', 'true');
        showToast('Administrative access granted', 'success');
        onSuccess();
      } else {
        setErrorMessage('Incorrect administrative security password.');
        showToast('Access Denied: Incorrect password', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Session handshake failed';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-screen flex flex-col items-center justify-center bg-[#080d10] text-[#e9edef] p-4 select-none relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00a884]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-[#0c1317] border border-[#202c33] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00a884] to-[#005c4b] shadow-xl shadow-[#00a884]/25 border border-[#00a884]/40">
            <Shield className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">DEV CHAT Admin Portal</h1>
          <p className="text-xs text-[#8696a0]">
            Restricted operations, platform diagnostics and moderation center
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Password Access Form */}
        <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8696a0] flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#00a884]" />
              <span>Administrative Security Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full rounded-xl bg-[#111b21] border border-[#202c33] px-3.5 py-3 text-sm text-center text-white placeholder-[#8696a0]/60 focus:border-[#00a884] focus:outline-none transition tracking-wide"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] disabled:opacity-50 text-[#111b21] font-bold text-xs shadow-lg shadow-[#00a884]/20 transition"
          >
            {loading ? (
              <span>Decrypting Session...</span>
            ) : (
              <>
                <span>Access Console</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation Back */}
        <div className="pt-2 border-t border-[#202c33] text-center">
          <button
            type="button"
            onClick={onReturnToApp}
            className="inline-flex items-center gap-1.5 text-xs text-[#8696a0] hover:text-[#00a884] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to DEV CHAT Application</span>
          </button>
        </div>
      </div>
    </div>
  );
};
