/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  AtSign,
  Camera,
  ArrowRight,
  AlertCircle,
  Check,
  Phone,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadFileWithProgress } from '../../services/storageService';
import { Avatar } from '../common/Avatar';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { Realistic3DIcon } from '../common/Realistic3DIcon';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
  onSwitchToPhone?: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onSwitchToLogin,
  onSwitchToPhone,
}) => {
  const { registerWithEmail, loginWithGoogle, checkUsernameAvailable, demoPhoneLogin } =
    useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('Hey there! I am using Chattr.');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken'
  >('idle');

  const handleUsernameChange = async (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    setUsername(cleaned);

    if (cleaned.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    try {
      const avail = await checkUsernameAvailable(cleaned);
      setUsernameStatus(avail ? 'available' : 'taken');
    } catch {
      setUsernameStatus('idle');
    }
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (usernameStatus === 'taken') {
      setError(`Username @${username} is already taken. Pick another.`);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      let finalPhotoURL = '';
      if (avatarFile) {
        const uploadRes = await uploadFileWithProgress(
          avatarFile,
          'avatars',
          `avatar_${username}_${Date.now()}.jpg`
        );
        finalPhotoURL = uploadRes.url;
      }

      await registerWithEmail(
        email.trim(),
        password,
        displayName.trim(),
        username.trim(),
        finalPhotoURL,
        bio.trim()
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Try signing in.');
      } else if (msg.includes('auth/unauthorized-domain')) {
        setError(
          'This domain is not yet authorized in Firebase Console. Please add it under Authentication > Settings > Authorized domains.'
        );
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
      if (msg.includes('auth/unauthorized-domain')) {
        setError(
          'This domain is not yet authorized in Firebase Console. Please add your domain to Authentication > Settings > Authorized domains.'
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

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-start bg-[#0b141a] px-4 py-8 sm:py-12 relative overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#25d366]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#128c7e]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-2.5">
            <Realistic3DIcon name="whatsapp" size="xl" showDots={true} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e9edef] flex items-center justify-center gap-1.5">
            <span>Create Your</span>
            <span className="text-[#25d366]">Account</span>
          </h1>
          <p className="mt-1 text-xs text-[#8696a0]">
            Sign up with email to start chatting on Chattr
          </p>
        </div>

        {/* Register Card */}
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

          {/* Quick Google Sign Up option */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-[#222d34] bg-[#202c33] py-2.5 text-xs font-medium text-[#e9edef] hover:bg-[#2a3942] disabled:opacity-50 transition mb-4 shadow-sm"
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
            <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#222d34]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#111b21] px-3 text-[#8696a0] tracking-wider">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Avatar Selector */}
            <div className="flex flex-col items-center justify-center mb-1">
              <div className="relative group cursor-pointer">
                <Avatar
                  src={avatarPreview}
                  name={displayName || 'User'}
                  size="xl"
                  className="ring-2 ring-[#25d366]/40"
                />
                <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="h-5 w-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                </label>
              </div>
              <span className="text-[11px] text-[#8696a0] mt-1.5">Tap avatar to upload photo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Display Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-9 pr-3 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                    Username (@handle)
                  </label>
                  {usernameStatus === 'available' && (
                    <span className="text-[10px] text-[#25d366] flex items-center gap-0.5">
                      <Check className="h-3 w-3" /> Available
                    </span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="text-[10px] text-rose-400">Taken</span>
                  )}
                </div>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="alexmorgan"
                    className={`w-full rounded-xl border bg-[#202c33] pl-9 pr-3 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 transition ${
                      usernameStatus === 'available'
                        ? 'border-[#25d366] focus:border-[#25d366] focus:ring-[#25d366]'
                        : usernameStatus === 'taken'
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-[#222d34] focus:border-[#25d366] focus:ring-[#25d366]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@domain.com"
                  className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-9 pr-3 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-9 pr-3 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-9 pr-3 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                Bio / About (Optional)
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={140}
                placeholder="Hey there! I am using Chattr."
                className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#009374] disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Creating your account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Phone Auth */}
          {onSwitchToPhone && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onSwitchToPhone}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#25d366] hover:underline transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Or sign up with Phone Number</span>
              </button>
            </div>
          )}

          <div className="mt-4 text-center text-xs text-[#8696a0]">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="font-medium text-[#25d366] hover:underline transition"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <PWAInstallButton />
        </div>
      </div>
    </div>
  );
};
