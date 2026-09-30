/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  ArrowRight,
  AlertCircle,
  Check,
  Camera,
  RefreshCw,
  ChevronDown,
  Edit2,
  Sparkles,
  ExternalLink,
  Info,
  ShieldCheck,
  Settings,
  Copy,
} from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { uploadFileWithProgress } from '../../services/storageService';
import { Realistic3DIcon } from '../common/Realistic3DIcon';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface PhoneAuthViewProps {
  onSwitchToEmail?: () => void;
}

interface Country {
  name: string;
  code: string;
  flag: string;
}

const POPULAR_COUNTRIES: Country[] = [
  { name: 'Uganda', code: '+256', flag: '🇺🇬' },
  { name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿' },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
];

const FIREBASE_CONSOLE_URL =
  'https://console.firebase.google.com/project/chatme-fb268/authentication/providers';
const FIREBASE_SETTINGS_URL =
  'https://console.firebase.google.com/project/chatme-fb268/authentication/settings';

export const PhoneAuthView: React.FC<PhoneAuthViewProps> = ({ onSwitchToEmail }) => {
  const {
    user,
    profile,
    loginWithGoogle,
    checkUsernameAvailable,
    completeProfileSetup,
    demoPhoneLogin,
  } = useAuth();
  const { showToast } = useToast();

  // Wizard Steps: 1: Phone input, 2: OTP verification, 3: Profile info (if user signed in but profile incomplete)
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');

  // Country selection
  const [selectedCountry, setSelectedCountry] = useState<Country>(POPULAR_COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Phone inputs
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirebaseConsoleError, setIsFirebaseConsoleError] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // OTP inputs
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Profile setup inputs (Step 3)
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('Hey there! I am using DEV CHAT.');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Recaptcha verifier ref
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Timer countdown for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // If user is authenticated but profile is missing, jump straight to Profile Setup step
  useEffect(() => {
    if (user && !profile) {
      setStep('profile');
      if (user.phoneNumber) {
        setPhoneNumber(user.phoneNumber);
      }
    }
  }, [user, profile]);

  const initRecaptcha = () => {
    if (!recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'invisible',
            callback: () => {
              // reCAPTCHA solved
            },
            'expired-callback': () => {
              setError('reCAPTCHA expired. Please try sending code again.');
            },
          }
        );
      } catch (err) {
        console.warn('reCAPTCHA init notice:', err);
      }
    }
    return recaptchaVerifierRef.current;
  };

  const fullPhoneNumber = `${selectedCountry.code}${phoneNumber.replace(/^0+/, '').replace(/\s+/g, '')}`;

  // STEP 1: SEND OTP CODE
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsFirebaseConsoleError(false);

    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (cleaned.length < 6) {
      setError('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const appVerifier = initRecaptcha();
      if (!appVerifier) {
        throw new Error('Verification service could not be initialized.');
      }

      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);
      setStep('otp');
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('auth/operation-not-allowed') ||
        msg.includes('CONFIGURATION_NOT_FOUND') ||
        msg.includes('auth/admin-restricted-operation')
      ) {
        setIsFirebaseConsoleError(true);
        setError(
          'Phone provider is not enabled in Firebase Console (project: gen-lang-client-0530556818). Click "Open Firebase Console" below to toggle Phone ON, or use Instant Demo Login.'
        );
      } else if (
        msg.includes('auth/invalid-app-credential') ||
        msg.includes('auth/app-not-authorized')
      ) {
        setIsFirebaseConsoleError(true);
        setError(
          'This web domain needs to be added to Firebase Authorized Domains. See setup instructions or use Demo Login.'
        );
      } else if (msg.includes('auth/invalid-phone-number')) {
        setError('The phone number format is invalid. Please check the country code and number.');
      } else if (msg.includes('auth/too-many-requests')) {
        setError('Too many SMS requests sent. Please wait a few minutes or use Quick Demo Login.');
      } else {
        setError(msg || 'Failed to send SMS code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY OTP
  const handleVerifyOtp = async (enteredOtp?: string) => {
    setError(null);
    const code = enteredOtp || otp.join('');

    if (code.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new code.');
      setStep('phone');
      return;
    }

    setLoading(true);
    try {
      const cred = await confirmationResult.confirm(code);
      if (cred.user) {
        setStep('profile');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/invalid-verification-code')) {
        setError('Invalid verification code. Please check and try again.');
      } else {
        setError('Verification failed. The code may have expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1).replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 filled
    if (digit && index === 5) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        handleVerifyOtp(fullCode);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    } else {
      otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  // STEP 3: USERNAME CHANGE & PROFILE FINISH
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
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleFinishProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameToUse = displayName.trim() || 'DEV CHAT Developer';
    const rawUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || nameToUse.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const userToUse = rawUsername.length >= 3 ? rawUsername : `user_${Math.random().toString(36).substring(2, 7)}`;

    setLoading(true);
    try {
      let finalPhotoURL = '';
      if (avatarFile) {
        try {
          const uploadRes = await uploadFileWithProgress(
            avatarFile,
            'avatars',
            `avatar_${userToUse}_${Date.now()}.jpg`
          );
          finalPhotoURL = uploadRes.url;
        } catch {
          // Graceful fallback
        }
      }

      await completeProfileSetup(
        nameToUse,
        userToUse,
        finalPhotoURL,
        bio.trim() || 'Hey there! I am using DEV CHAT.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Quick Demo Login (Guaranteed Instant Access)
  const handleQuickDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await demoPhoneLogin(fullPhoneNumber || '+256700123456', 'DEV CHAT Developer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setError(msg);
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`, 'success');
  };

  const fillTestNumber = () => {
    setSelectedCountry(POPULAR_COUNTRIES[0]); // Uganda +256
    setPhoneNumber('700123456');
    showToast('Prefilled test number: +256 700 123456', 'info');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b141a] px-4 py-8 relative overflow-hidden select-none">
      {/* Hidden reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container" />

      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#25d366]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#128c7e]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <Realistic3DIcon name="whatsapp" size="xl" showDots={true} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e9edef] flex items-center justify-center gap-1.5">
            <span>DEV CHAT</span>
            <span className="text-[#25d366]">Web</span>
          </h1>
          <p className="mt-1 text-xs text-[#8696a0]">
            {step === 'phone' && 'Verify your phone number to start chatting'}
            {step === 'otp' && 'Enter the 6-digit code sent to your phone'}
            {step === 'profile' && 'Complete your profile setup'}
          </p>

          {/* Firebase Phone Auth Setup Helper Link */}
          <button
            type="button"
            onClick={() => setShowSetupModal(true)}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#111b21] px-3 py-1 text-[11px] font-medium text-[#25d366] border border-[#25d366]/30 hover:bg-[#202c33] transition"
          >
            <Settings className="h-3 w-3" />
            <span>Firebase Phone Provider Setup Guide</span>
          </button>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-[#222d34] bg-[#111b21] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex flex-col gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>

              {isFirebaseConsoleError && (
                <div className="mt-1 flex flex-col gap-1.5">
                  <a
                    href={FIREBASE_CONSOLE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-2 font-bold text-slate-950 hover:bg-[#22bf5b] transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open Firebase Console to Enable Phone Provider</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowSetupModal(true)}
                    className="text-[11px] text-[#25d366] hover:underline text-center"
                  >
                    View step-by-step instructions
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleQuickDemo}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00a884] px-3 py-1.5 font-semibold text-white hover:bg-[#009374] transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Instant 1-Click Demo Login (No SMS Required)</span>
              </button>
            </div>
          )}

          {/* ================= STEP 1: PHONE NUMBER INPUT ================= */}
          {step === 'phone' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="text-center text-xs text-[#8696a0] mb-2 leading-relaxed">
                DEV CHAT will send an SMS to verify your phone number. Enter your country code and phone number below.
              </div>

              {/* Country Selector Dropdown */}
              <div className="relative">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0] block mb-1">
                  Country / Region
                </label>
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="w-full flex items-center justify-between rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2.5 text-xs text-[#e9edef] hover:border-[#25d366]/40 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="font-medium">{selectedCountry.name}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[#8696a0]">
                    <span>{selectedCountry.code}</span>
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>

                {/* Country List Dropdown */}
                {showCountryPicker && (
                  <div className="absolute left-0 right-0 top-16 z-30 max-h-56 overflow-y-auto rounded-xl border border-[#222d34] bg-[#202c33] p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in">
                    {POPULAR_COUNTRIES.map((c) => (
                      <button
                        key={c.code + c.name}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setShowCountryPicker(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                          selectedCountry.code === c.code && selectedCountry.name === c.name
                            ? 'bg-[#005c4b] text-[#25d366] font-semibold'
                            : 'text-[#e9edef] hover:bg-[#111b21]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.name}</span>
                        </span>
                        <span className="text-[#8696a0] font-mono">{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0] block">
                    Phone Number
                  </label>
                  <button
                    type="button"
                    onClick={fillTestNumber}
                    className="text-[10px] text-[#25d366] hover:underline"
                  >
                    Use test number
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2.5 text-xs font-mono font-bold text-[#25d366] select-none">
                    {selectedCountry.code}
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="700 123 456"
                      className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2.5 text-xs text-[#e9edef] font-mono placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#009374] disabled:opacity-50 transition"
              >
                {loading ? (
                  <span>Sending SMS code...</span>
                ) : (
                  <>
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* 1-Click Demo Login */}
              <button
                type="button"
                onClick={handleQuickDemo}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#25d366]/40 bg-[#005c4b]/30 py-2.5 text-xs font-semibold text-[#25d366] hover:bg-[#005c4b]/50 transition"
              >
                <Sparkles className="h-4 w-4" />
                <span>Quick Demo Login (No SMS Required)</span>
              </button>

              {/* Alternative divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#222d34]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#111b21] px-3 text-[#8696a0] tracking-wider">or sign in with</span>
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
                <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              {onSwitchToEmail && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onSwitchToEmail}
                    className="text-xs text-[#8696a0] hover:text-[#25d366] transition underline"
                  >
                    Use email & password instead
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ================= STEP 2: 6-DIGIT OTP VERIFICATION ================= */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-xs text-[#8696a0] mb-1">
                  We have sent an SMS with a code to
                </div>
                <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#e9edef] font-mono">
                  <span>{fullPhoneNumber}</span>
                  <button
                    onClick={() => setStep('phone')}
                    className="text-[#25d366] hover:underline p-1"
                    title="Edit phone number"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* 6-box input */}
              <div className="flex items-center justify-center gap-2 py-3">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="h-12 w-11 text-center font-mono text-lg font-bold rounded-xl border border-[#222d34] bg-[#202c33] text-[#e9edef] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.join('').length < 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#009374] disabled:opacity-50 transition"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              {/* Resend Countdown */}
              <div className="text-center text-xs text-[#8696a0]">
                {timer > 0 ? (
                  <span>Resend code in {timer}s</span>
                ) : (
                  <button
                    onClick={handleSendCode}
                    className="text-[#25d366] font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Resend SMS</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full text-center text-xs text-[#25d366] hover:underline pt-1"
              >
                Skip code with Quick Demo Login
              </button>
            </div>
          )}

          {/* ================= STEP 3: PROFILE SETUP ================= */}
          {step === 'profile' && (
            <form onSubmit={handleFinishProfile} className="space-y-4">
              <div className="text-center text-xs text-[#8696a0] mb-2">
                Please provide your name and an optional profile photo to complete your DEV CHAT profile.
              </div>

              {/* Avatar Selector */}
              <div className="flex flex-col items-center justify-center mb-2">
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
                <span className="text-[11px] text-[#8696a0] mt-1.5">Add photo</span>
              </div>

              {/* Display Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                  autoFocus
                />
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8696a0]">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="alexmorgan"
                    className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-8 pr-3 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                  About
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={140}
                  placeholder="Hey there! I am using DEV CHAT."
                  className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
                />
              </div>

              {/* Finish Setup Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#009374] disabled:opacity-50 transition"
              >
                {loading ? 'Setting up profile...' : 'Finish & Start Chatting'}
              </button>
            </form>
          )}
        </div>

        {/* Footer PWA Install */}
        <div className="mt-5 flex justify-center">
          <PWAInstallButton />
        </div>
      </div>

      {/* Firebase Phone Authentication Setup Modal */}
      <Modal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        title="Firebase Phone Provider Activation"
        subtitle="Follow these 3 quick steps in the Firebase Console"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs text-[#8696a0]">
          {/* Step 1 */}
          <div className="rounded-xl border border-[#222d34] bg-[#202c33] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#e9edef] flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25d366] text-slate-950 text-[10px] font-black">
                  1
                </span>
                Enable Phone Provider
              </span>
              <a
                href={FIREBASE_CONSOLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#25d366] hover:underline"
              >
                <span>Open Providers</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p>
              In Firebase Console under <strong>Sign-in method</strong>, click on <strong>Phone</strong> and toggle the <strong>Enable</strong> switch to ON, then click <strong>Save</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-[#222d34] bg-[#202c33] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#e9edef] flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25d366] text-slate-950 text-[10px] font-black">
                  2
                </span>
                Add Authorized Domain
              </span>
              <a
                href={FIREBASE_SETTINGS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#25d366] hover:underline"
              >
                <span>Open Settings</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p>
              Go to <strong>Authentication &gt; Settings &gt; Authorized domains</strong>, click <strong>Add domain</strong>, and paste your current host domain:
            </p>
            <div className="flex items-center justify-between rounded-lg bg-[#111b21] p-2 font-mono text-[11px] text-[#e9edef]">
              <span>{typeof window !== 'undefined' ? window.location.hostname : 'run.app'}</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    typeof window !== 'undefined' ? window.location.hostname : 'run.app',
                    'Domain'
                  )
                }
                className="text-[#25d366] hover:text-white p-1"
                title="Copy domain"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-[#222d34] bg-[#202c33] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#e9edef] flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25d366] text-slate-950 text-[10px] font-black">
                  3
                </span>
                (Optional) Add Phone Numbers for Testing
              </span>
            </div>
            <p>
              Under "Phone numbers for testing" in the Phone provider settings, you can register test numbers that bypass SMS quota limits and carrier delays:
            </p>
            <div className="rounded-lg bg-[#111b21] p-2.5 font-mono text-[11px] space-y-1 text-[#e9edef]">
              <div className="flex justify-between">
                <span className="text-[#8696a0]">Test Phone:</span>
                <span className="font-bold text-[#25d366]">+256 700 123456</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8696a0]">Verification Code:</span>
                <span className="font-bold text-[#25d366]">123456</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <a
              href={FIREBASE_CONSOLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-white hover:bg-[#009374] transition"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Go to Firebase Console</span>
            </a>
            <button
              type="button"
              onClick={() => setShowSetupModal(false)}
              className="rounded-xl border border-[#222d34] px-4 py-2.5 text-xs font-medium text-[#e9edef] hover:bg-[#202c33] transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
