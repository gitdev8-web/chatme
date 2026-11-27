/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Sliders,
  PhoneOff,
  X,
  Lock,
  Users,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { ConfirmModal } from '../common/ConfirmModal';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { sound } from '../../hooks/useSound';
import {
  createMeetSpace,
  endMeetActiveConference,
  getMeetAccessToken,
  getMeetSpace,
  MeetSpace,
  updateMeetSpaceSettings,
} from '../../services/googleMeetService';
import {
  endCall,
  initiateCall,
  markCallMissed,
  subscribeToCallSession,
} from '../../services/callService';
import { MeetInviteData } from '../../types';

interface GoogleMeetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  photoURL?: string;
  isIncoming?: boolean;
  isGroup?: boolean;
  targetUid?: string;
  targetName?: string;
  callSessionId?: string;
  initialMeetSpace?: {
    meetingUri: string;
    meetingCode: string;
    spaceName: string;
  };
  onSpaceCreated?: (invite: MeetInviteData, createdCallId?: string) => Promise<void> | void;
}

export const GoogleMeetModal: React.FC<GoogleMeetModalProps> = ({
  isOpen,
  onClose,
  title,
  photoURL,
  isIncoming = false,
  isGroup = false,
  targetUid,
  targetName,
  callSessionId: initialCallSessionId,
  initialMeetSpace,
  onSpaceCreated,
}) => {
  const { user, profile, meetConnected, connectGoogleMeet } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<'auth' | 'creating' | 'ready' | 'error'>('auth');
  const [space, setSpace] = useState<MeetSpace | null>(null);
  const [callId, setCallId] = useState<string | undefined>(initialCallSessionId);
  const [callStatus, setCallStatus] = useState<
    'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'active'
  >(isIncoming ? 'accepted' : targetUid ? 'ringing' : 'active');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Room settings state & explicit confirmation dialog state
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAccessType, setSelectedAccessType] = useState<'OPEN' | 'TRUSTED' | 'RESTRICTED'>('OPEN');
  const [selectedModeration, setSelectedModeration] = useState<'OFF' | 'ON'>('OFF');
  const [confirmAction, setConfirmAction] = useState<'settings' | 'end-conference' | null>(null);
  const [mutating, setMutating] = useState(false);

  const missedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);
  const createdOnceRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const clearTimers = () => {
    if (missedTimeoutRef.current) {
      clearTimeout(missedTimeoutRef.current);
      missedTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const initialMeetingUri = initialMeetSpace?.meetingUri;
  const initialMeetingCode = initialMeetSpace?.meetingCode;
  const initialSpaceName = initialMeetSpace?.spaceName;

  // Initialize or create Meet room when modal opens
  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      sound.stopRingtone();
      createdOnceRef.current = false;
      isClosingRef.current = false;
      setSpace(null);
      setCallId(initialCallSessionId);
      setErrorMsg(null);
      setShowSettings(false);
      setConfirmAction(null);
      return;
    }

    setCallId(initialCallSessionId);
    setCallStatus(isIncoming ? 'accepted' : targetUid ? 'ringing' : 'active');

    if (initialMeetingUri) {
      setSpace({
        name: initialSpaceName || '',
        meetingUri: initialMeetingUri,
        meetingCode: initialMeetingCode || '',
      });
      setStep('ready');
      return;
    }

    const token = getMeetAccessToken();
    if (!token) {
      setStep('auth');
      return;
    }

    if (!createdOnceRef.current) {
      createdOnceRef.current = true;
      void provisionMeetRoom(token);
    }
  }, [
    isOpen,
    initialMeetingUri,
    initialMeetingCode,
    initialSpaceName,
    initialCallSessionId,
    isIncoming,
    targetUid,
  ]);

  const provisionMeetRoom = async (accessToken: string) => {
    setStep('creating');
    setErrorMsg(null);
    try {
      const created = await createMeetSpace(accessToken, 'OPEN');
      setSpace(created);
      if (created.config?.accessType && created.config.accessType !== 'ACCESS_TYPE_UNSPECIFIED') {
        setSelectedAccessType(created.config.accessType);
      }
      if (created.config?.moderation && created.config.moderation !== 'MODERATION_UNSPECIFIED') {
        setSelectedModeration(created.config.moderation);
      }

      let createdCallId = initialCallSessionId;
      if (!isIncoming && targetUid && user && !createdCallId) {
        createdCallId = await initiateCall(
          user.uid,
          profile?.displayName || user.displayName || 'DEV CHAT User',
          profile?.photoURL || user.photoURL || '',
          targetUid,
          targetName || title,
          'video',
          {
            provider: 'google-meet',
            meetUri: created.meetingUri,
            meetCode: created.meetingCode,
            meetSpaceName: created.name,
          }
        );
        setCallId(createdCallId);
        setCallStatus('ringing');
      }

      setStep('ready');

      if (onSpaceCreated) {
        await onSpaceCreated(
          {
            meetingUri: created.meetingUri,
            meetingCode: created.meetingCode,
            spaceName: created.name,
            callId: createdCallId,
            hostName: profile?.displayName || user?.displayName || 'Host',
            accessType:
              created.config?.accessType === 'TRUSTED' || created.config?.accessType === 'RESTRICTED'
                ? created.config.accessType
                : 'OPEN',
            createdAt: new Date().toISOString(),
          },
          createdCallId
        );
      }
    } catch (err: unknown) {
      createdOnceRef.current = false;
      const msg = err instanceof Error ? err.message : 'Unable to create Google Meet session';
      if (msg === 'MEET_AUTH_EXPIRED') {
        setStep('auth');
        showToast('Google Meet session expired. Please reconnect.', 'info');
      } else {
        setErrorMsg(msg);
        setStep('error');
      }
    }
  };

  // Subscribe to Firestore call signaling if this is a 1-on-1 call
  useEffect(() => {
    if (!isOpen || !callId) return;

    if (!isIncoming && step === 'ready' && callStatus === 'ringing') {
      sound.startRingtone();
      missedTimeoutRef.current = setTimeout(async () => {
        if (isClosingRef.current) return;
        sound.stopRingtone();
        sound.playCallEnd();
        setCallStatus('missed');
        await markCallMissed(callId);
      }, 45000);
    }

    const unsub = subscribeToCallSession(callId, (session) => {
      if (!session) return;
      if (session.status === 'accepted') {
        clearTimers();
        sound.stopRingtone();
        setCallStatus('accepted');
      } else if (session.status === 'rejected') {
        clearTimers();
        sound.stopRingtone();
        sound.playCallEnd();
        setCallStatus('rejected');
      } else if (session.status === 'missed') {
        clearTimers();
        sound.stopRingtone();
        setCallStatus('missed');
      } else if (session.status === 'ended') {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        clearTimers();
        sound.stopRingtone();
        sound.playCallEnd();
        setCallStatus('ended');
        closeTimeoutRef.current = setTimeout(() => onCloseRef.current(), 1200);
      }
    });

    return () => {
      unsub();
      clearTimers();
      sound.stopRingtone();
    };
  }, [isOpen, callId, isIncoming, step]);

  const handleAuthorize = async () => {
    setAuthLoading(true);
    setErrorMsg(null);
    try {
      const token = await connectGoogleMeet();
      createdOnceRef.current = true;
      await provisionMeetRoom(token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled or failed';
      setErrorMsg(msg);
      showToast('Could not connect Google Meet', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!space?.meetingUri) return;
    navigator.clipboard.writeText(space.meetingUri);
    setCopied(true);
    showToast('Google Meet link copied', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshSpace = async () => {
    if (!space?.name) return;
    let token = getMeetAccessToken();
    if (!token) {
      try {
        token = await connectGoogleMeet();
      } catch {
        showToast('Connect Google Meet to inspect room status', 'info');
        return;
      }
    }
    setRefreshing(true);
    try {
      const updated = await getMeetSpace(token, space.name);
      setSpace(updated);
      showToast(
        updated.activeConference?.conferenceRecord
          ? 'Conference is currently active'
          : 'Room is ready — waiting for participants to join',
        'info'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not refresh room status';
      if (msg === 'MEET_AUTH_EXPIRED') {
        showToast('Please reconnect Google Meet to check status', 'warning');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmedMutation = async () => {
    if (!space?.name || !confirmAction) return;
    setMutating(true);
    try {
      let token = getMeetAccessToken();
      if (!token) {
        token = await connectGoogleMeet();
      }

      if (confirmAction === 'settings') {
        const updated = await updateMeetSpaceSettings(token, space.name, {
          accessType: selectedAccessType,
          moderation: selectedModeration,
        });
        setSpace(updated);
        setShowSettings(false);
        showToast('Google Meet room settings updated', 'success');
      } else if (confirmAction === 'end-conference') {
        await endMeetActiveConference(token, space.name);
        if (callId) {
          await endCall(callId);
        }
        showToast('Google Meet conference ended for all participants', 'info');
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg === 'MEET_AUTH_EXPIRED' ? 'Please reconnect Google Meet and retry' : msg, 'error');
    } finally {
      setMutating(false);
      setConfirmAction(null);
    }
  };

  const handleDismissModal = () => {
    if (isClosingRef.current) return;
    // If caller cancels before recipient picks up, end the ringing invite
    if (callId && !isIncoming && callStatus === 'ringing') {
      void handleHangupAndClose();
      return;
    }
    isClosingRef.current = true;
    clearTimers();
    sound.stopRingtone();
    onClose();
  };

  const handleHangupAndClose = async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    clearTimers();
    sound.stopRingtone();
    if (callId && callStatus !== 'ended' && callStatus !== 'rejected') {
      await endCall(callId);
    }
    onClose();
  };

  if (!isOpen) return null;

  const statusBadgeText =
    callStatus === 'accepted'
      ? 'Call Accepted · Join Meet'
      : callStatus === 'rejected'
      ? 'Call Declined'
      : callStatus === 'missed'
      ? 'No Answer · Link Sent in Chat'
      : callStatus === 'ended'
      ? 'Session Ended'
      : callStatus === 'ringing'
      ? 'Ringing Recipient...'
      : 'Google Meet Ready';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in select-none">
        <div className="relative w-full max-w-md rounded-3xl border border-[#222d34] bg-[#111b21] text-[#e9edef] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#222d34] bg-[#182229]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00a884]/15 text-[#25d366] flex-shrink-0">
                <Video className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#e9edef] truncate">
                  Google Meet Video
                </h3>
                <p className="text-[11px] text-[#8696a0] truncate">
                  {isGroup ? `Group · ${title}` : title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissModal}
              aria-label="Close Google Meet modal"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8696a0] hover:bg-[#202c33] hover:text-[#e9edef] transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-5">
            {/* Step 1: Connect Google Meet */}
            {step === 'auth' && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00a884]/15 text-[#25d366]">
                  <Video className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-[#e9edef]">
                    Connect Google Meet
                  </h4>
                  <p className="text-xs text-[#8696a0] leading-relaxed">
                    Authorize Google Meet once for this session so DEV CHAT can create and manage video call rooms on your behalf.
                  </p>
                </div>

                {errorMsg && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2 text-left">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <GoogleSignInButton
                  onClick={handleAuthorize}
                  loading={authLoading}
                  label="Continue with Google"
                />

                <p className="text-[11px] text-[#8696a0] flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3 text-[#00a884]" />
                  <span>Access token stays in memory for this session only</span>
                </p>
              </div>
            )}

            {/* Step 2: Creating Meet Room */}
            {step === 'creating' && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00a884]/15 text-[#25d366]">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
                <p className="text-sm font-semibold text-[#e9edef]">
                  Creating Google Meet room...
                </p>
                <p className="text-xs text-[#8696a0]">
                  Preparing your secure video session for {title}
                </p>
              </div>
            )}

            {/* Step 3: Error creating Meet Room */}
            {step === 'error' && (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#e9edef]">
                    Could not start Google Meet
                  </h4>
                  <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                    {errorMsg || 'Please reconnect your Google account and try again.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <GoogleSignInButton
                    onClick={handleAuthorize}
                    loading={authLoading}
                    label="Reconnect Google Account"
                  />
                  <button
                    type="button"
                    onClick={handleHangupAndClose}
                    className="rounded-xl bg-[#202c33] px-4 py-2.5 text-xs font-semibold text-[#e9edef] hover:bg-[#2a3942] transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Room Ready / Active Call */}
            {step === 'ready' && space && (
              <div className="space-y-4">
                {/* Participant / Status Summary */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-[#222d34] bg-[#182229] p-3.5">
                  <Avatar src={photoURL} name={title} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          callStatus === 'rejected' || callStatus === 'ended'
                            ? 'bg-rose-400'
                            : callStatus === 'missed'
                            ? 'bg-amber-400'
                            : 'bg-[#25d366] animate-pulse'
                        }`}
                      />
                      <span className="text-xs font-semibold text-[#25d366]">
                        {statusBadgeText}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#e9edef] truncate mt-0.5">
                      {title}
                    </p>
                    <p className="text-[11px] font-mono text-[#8696a0] truncate mt-0.5">
                      Code: {space.meetingCode}
                    </p>
                  </div>
                </div>

                {/* Live Conference Indicator */}
                <div className="flex items-center justify-between rounded-xl border border-[#222d34] bg-[#202c33]/50 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 text-[#00a884] flex-shrink-0" />
                    <span className="text-[#8696a0] truncate">
                      {space.activeConference?.conferenceRecord
                        ? 'Live conference in progress'
                        : 'Meeting link active & ready'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshSpace}
                    disabled={refreshing}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#00a884] hover:underline flex-shrink-0 ml-2"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Primary Join & Copy Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <a
                    href={space.meetingUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#00a884] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#0b141a] hover:bg-[#06cf9c] shadow-lg transition active:scale-[0.99]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Join Google Meet</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[#222d34] bg-[#202c33] px-4 py-2.5 text-xs font-semibold text-[#e9edef] hover:bg-[#2a3942] transition"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-[#25d366]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Room URL preview */}
                <div className="rounded-xl bg-[#0b141a] border border-[#222d34] px-3 py-2 text-[11px] font-mono text-[#8696a0] truncate">
                  {space.meetingUri}
                </div>

                {/* Space Settings (when Meet OAuth connected or creator) */}
                {!isIncoming && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSettings((prev) => !prev)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#8696a0] hover:text-[#e9edef] transition"
                      >
                        <Sliders className="h-3.5 w-3.5 text-[#00a884]" />
                        <span>{showSettings ? 'Hide Room Settings' : 'Room Access Settings'}</span>
                      </button>

                      {meetConnected && (
                        <button
                          type="button"
                          onClick={() => setConfirmAction('end-conference')}
                          className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                        >
                          <PhoneOff className="h-3.5 w-3.5" />
                          <span>End Meet for All</span>
                        </button>
                      )}
                    </div>

                    {showSettings && (
                      <div className="rounded-2xl border border-[#222d34] bg-[#182229] p-3.5 space-y-3 animate-in fade-in">
                        <div>
                          <label className="block text-[11px] font-medium text-[#8696a0] mb-1">
                            Meeting Access Type
                          </label>
                          <select
                            value={selectedAccessType}
                            onChange={(e) =>
                              setSelectedAccessType(
                                e.target.value as 'OPEN' | 'TRUSTED' | 'RESTRICTED'
                              )
                            }
                            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2 text-xs text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                          >
                            <option value="OPEN">Open (Anyone with link can join)</option>
                            <option value="TRUSTED">Trusted (Workspace & invited users)</option>
                            <option value="RESTRICTED">Restricted (Host must admit)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#8696a0] mb-1">
                            Host Moderation
                          </label>
                          <select
                            value={selectedModeration}
                            onChange={(e) =>
                              setSelectedModeration(e.target.value as 'OFF' | 'ON')
                            }
                            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2 text-xs text-[#e9edef] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                          >
                            <option value="OFF">Off (Participants can share freely)</option>
                            <option value="ON">On (Host controls screen & audio)</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => setConfirmAction('settings')}
                          className="w-full rounded-xl bg-[#202c33] border border-[#00a884]/40 py-2 text-xs font-semibold text-[#25d366] hover:bg-[#00a884] hover:text-[#0b141a] transition"
                        >
                          Apply Room Settings
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#222d34]">
                  <span className="flex items-center gap-1.5 text-[11px] text-[#8696a0]">
                    <Shield className="h-3.5 w-3.5 text-[#00a884]" />
                    <span>Powered by Google Meet</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {callId && callStatus === 'accepted' && (
                      <button
                        type="button"
                        onClick={handleDismissModal}
                        className="rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2 text-xs font-semibold text-[#e9edef] hover:bg-[#2a3942] transition"
                      >
                        Done
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleHangupAndClose}
                      className="rounded-xl bg-[#ea4335]/15 border border-[#ea4335]/35 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-[#ea4335] hover:text-white transition"
                    >
                      {callId
                        ? callStatus === 'ringing'
                          ? 'Cancel Call'
                          : 'End Call'
                        : 'Done'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explicit Confirmation Modal for Mutating Google Meet API Operations */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmedMutation}
        loading={mutating}
        title={
          confirmAction === 'end-conference'
            ? 'End Google Meet for everyone?'
            : 'Update Google Meet room settings?'
        }
        description={
          confirmAction === 'end-conference'
            ? `This will immediately disconnect all active participants from Google Meet room ${space?.meetingCode || ''}.`
            : `Update room ${space?.meetingCode || ''} to ${selectedAccessType} access with moderation ${selectedModeration}.`
        }
        confirmText={confirmAction === 'end-conference' ? 'End Meeting' : 'Update Settings'}
        variant={confirmAction === 'end-conference' ? 'danger' : 'warning'}
      />
    </>
  );
};
