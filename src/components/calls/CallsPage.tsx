/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Phone,
  Video,
  ArrowLeft,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Sparkles,
  UserPlus,
  X,
  Clock,
  ExternalLink,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { CallSession, UserProfile } from '../../types';
import {
  clearUserCallHistory,
  getCallDurationSeconds,
  hideCallFromHistory,
  initiateCall,
  subscribeToUserCallHistory,
} from '../../services/callService';
import { Avatar } from '../common/Avatar';
import { ConfirmModal } from '../common/ConfirmModal';
import { CallModal } from './CallModal';
import { GoogleMeetModal } from './GoogleMeetModal';
import { useToast } from '../common/Toast';
import { isUserOnline } from '../../utils/presenceUtils';

interface CallsPageProps {
  onBackMobile?: () => void;
  onOpenContacts?: () => void;
  voiceCallsEnabled?: boolean;
  videoCallsEnabled?: boolean;
}

export const CallsPage: React.FC<CallsPageProps> = ({
  onBackMobile,
  onOpenContacts,
  voiceCallsEnabled = true,
  videoCallsEnabled = true,
}) => {
  const { user, profile } = useAuth();
  const { userCache, getUserProfile, startDirectChat } = useChat();
  const { showToast } = useToast();

  const [callHistory, setCallHistory] = useState<CallSession[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'missed' | 'audio' | 'video'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingCalls, setClearingCalls] = useState(false);

  // Outgoing call modal state
  const [activeCall, setActiveCall] = useState<{
    sessionId: string;
    contactName: string;
    contactPhoto?: string;
    callType: 'audio' | 'video';
  } | null>(null);
  const [activeMeetCall, setActiveMeetCall] = useState<{
    targetUid?: string;
    contactName: string;
    contactPhoto?: string;
  } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUserCallHistory(user.uid, (calls) => {
      setCallHistory(calls);
      calls.slice(0, 25).forEach((c) => {
        const peerId = c.callerId === user.uid ? c.receiverId : c.callerId;
        if (peerId && !userCache[peerId]) {
          void getUserProfile(peerId);
        }
      });
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(collection(db, 'users'), limit(30)))
      .then((snap) => {
        const list: UserProfile[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          const uid = data.uid || docSnap.id;
          if (uid !== user.uid && !data.isDisabled) {
            list.push({ ...data, uid });
          }
        });
        setDirectoryUsers(list);
      })
      .catch(() => {});
  }, [user?.uid]);

  const handlePlaceCall = async (
    targetUid: string,
    targetName: string,
    targetPhoto: string | undefined,
    type: 'audio' | 'video'
  ) => {
    if (!user) return;
    if (type === 'audio' && !voiceCallsEnabled) {
      showToast('Voice calls are currently disabled by administrator', 'warning');
      return;
    }
    if (type === 'video') {
      if (!videoCallsEnabled) {
        showToast('Video calls are currently disabled by administrator', 'warning');
        return;
      }
      setActiveMeetCall({
        targetUid,
        contactName: targetName,
        contactPhoto: targetPhoto,
      });
      return;
    }
    try {
      const sessionId = await initiateCall(
        user.uid,
        profile?.displayName || user.displayName || 'DEV CHAT User',
        profile?.photoURL || user.photoURL || '',
        targetUid,
        targetName,
        type
      );
      setActiveCall({
        sessionId,
        contactName: targetName,
        contactPhoto: targetPhoto,
        callType: type,
      });
    } catch {
      showToast('Could not initiate call', 'error');
    }
  };

  const handleInstantMeet = () => {
    if (!videoCallsEnabled) {
      showToast('Video calls are currently disabled by administrator', 'warning');
      return;
    }
    setActiveMeetCall({
      contactName: 'Instant Google Meet',
      contactPhoto: profile?.photoURL || user?.photoURL || undefined,
    });
  };

  const filteredHistory = useMemo(() => {
    return callHistory.filter((call) => {
      const isMissed =
        call.receiverId === user?.uid &&
        (call.status === 'missed' || call.status === 'rejected');
      if (filterType === 'missed' && !isMissed) return false;
      if (filterType === 'audio' && call.callType !== 'audio') return false;
      if (filterType === 'video' && call.callType !== 'video') return false;

      if (searchTerm.trim()) {
        const peerId = call.callerId === user?.uid ? call.receiverId : call.callerId;
        const peer = userCache[peerId];
        const label =
          peer?.displayName ||
          (call.callerId === user?.uid ? call.receiverName : call.callerName) ||
          '';
        return label.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [callHistory, filterType, searchTerm, user?.uid, userCache]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return directoryUsers.slice(0, 8);
    const q = searchTerm.toLowerCase();
    return directoryUsers.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q)
    );
  }, [directoryUsers, searchTerm]);

  const formatDurationLabel = (secs: number | null) => {
    if (!secs) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleOpenDirectChat = async (targetUid?: string) => {
    if (!targetUid || targetUid === user?.uid) return;
    try {
      await startDirectChat(targetUid);
      onBackMobile?.();
    } catch {
      showToast('Could not open conversation', 'error');
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b141a] text-[#e9edef] select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex h-14 md:h-16 items-center justify-between border-b border-[#222d34] bg-[#202c33] px-3.5 sm:px-4 py-2 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-full text-[#8696a0] hover:bg-[#111b21] hover:text-white transition"
              title="Back"
              aria-label="Back to chats"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-[#00a884]" />
            <h1 className="text-base sm:text-lg font-semibold text-[#e9edef]">Calls</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstantMeet}
            disabled={!videoCallsEnabled}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#25d366]/15 border border-[#25d366]/35 px-3 py-2 text-xs font-bold text-[#25d366] hover:bg-[#00a884] hover:text-[#0b141a] transition disabled:opacity-50"
          >
            <Video className="h-4 w-4" />
            <span>New Meet</span>
          </button>

          {onOpenContacts && (
            <button
              type="button"
              onClick={onOpenContacts}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#00a884] px-3.5 py-2 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] transition shadow-md"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Contacts</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full pb-24 md:pb-8">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search call logs or contacts to dial..."
              className="w-full rounded-xl bg-[#202c33] border border-[#222d34] pl-10 pr-9 py-2.5 text-[15px] md:text-xs text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'missed', label: 'Missed' },
              { id: 'audio', label: 'Voice' },
              { id: 'video', label: 'Video' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as typeof filterType)}
                className={`rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition ${
                  filterType === f.id
                    ? 'bg-[#00a884] text-[#0b141a] font-semibold'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] border border-[#222d34]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Dial Contacts */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8696a0] px-1">
            Quick Dial Contacts
          </h3>
          {filteredContacts.length === 0 ? (
            <div className="rounded-2xl border border-[#222d34] bg-[#111b21] p-5 text-center text-xs text-[#8696a0]">
              No contacts found matching "{searchTerm}"
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredContacts.map((contact) => {
                const online = isUserOnline(contact);
                return (
                  <div
                    key={contact.uid}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#222d34] bg-[#111b21] p-3.5 hover:bg-[#202c33]/70 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={contact.photoURL}
                        name={contact.displayName || 'User'}
                        size="md"
                        isOnline={online}
                        showPresence={true}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#e9edef] truncate">
                          {contact.displayName}
                        </p>
                        <p className="text-[11px] text-[#8696a0] truncate">
                          {online ? 'Online' : `@${contact.username}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleOpenDirectChat(contact.uid)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef] transition"
                        title="Send message"
                        aria-label={`Message ${contact.displayName}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePlaceCall(contact.uid, contact.displayName, contact.photoURL, 'audio')
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#202c33] text-[#00a884] hover:bg-[#00a884] hover:text-[#0b141a] transition"
                        title="Voice Call"
                        aria-label={`Voice call ${contact.displayName}`}
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePlaceCall(contact.uid, contact.displayName, contact.photoURL, 'video')
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#202c33] text-[#53bdeb] hover:bg-[#53bdeb] hover:text-[#0b141a] transition"
                        title="Video Call"
                        aria-label={`Video call ${contact.displayName}`}
                      >
                        <Video className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Call Logs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">
              Recent Calls ({filteredHistory.length})
            </h3>
            {callHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear log</span>
              </button>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="rounded-3xl border border-[#222d34] bg-[#111b21] p-8 text-center space-y-2.5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00a884]/15 text-[#00a884]">
                <Clock className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-[#e9edef]">No call history yet</p>
              <p className="text-xs text-[#8696a0] max-w-sm mx-auto">
                Start an encrypted voice or video call with any contact above to see your call logs here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#222d34] rounded-2xl border border-[#222d34] bg-[#111b21] overflow-hidden">
              {filteredHistory.map((call) => {
                const isOutgoing = call.callerId === user?.uid;
                const peerId = isOutgoing ? call.receiverId : call.callerId;
                const peerProfile = userCache[peerId];
                const peerName =
                  peerProfile?.displayName ||
                  (isOutgoing ? call.receiverName : call.callerName) ||
                  'DEV CHAT Contact';
                const peerPhoto =
                  peerProfile?.photoURL || (isOutgoing ? undefined : call.callerPhoto);
                const isMissed =
                  !isOutgoing && (call.status === 'missed' || call.status === 'rejected');
                const dur = formatDurationLabel(getCallDurationSeconds(call));

                return (
                  <div
                    key={call.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#202c33]/50 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar src={peerPhoto} name={peerName} size="md" />
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isMissed ? 'text-rose-400' : 'text-[#e9edef]'
                          }`}
                        >
                          {peerName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#8696a0] mt-0.5 tabular-nums">
                          {isMissed ? (
                            <PhoneMissed className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
                          ) : isOutgoing ? (
                            <PhoneOutgoing className="h-3.5 w-3.5 text-[#00a884] flex-shrink-0" />
                          ) : (
                            <PhoneIncoming className="h-3.5 w-3.5 text-[#53bdeb] flex-shrink-0" />
                          )}
                          <span>
                            {isMissed
                              ? 'Missed'
                              : isOutgoing && call.status === 'missed'
                              ? 'No Answer'
                              : isOutgoing && call.status === 'rejected'
                              ? 'Declined'
                              : isOutgoing
                              ? 'Outgoing'
                              : 'Incoming'}
                          </span>
                          <span>·</span>
                          <span>
                            {new Date(call.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {call.provider === 'google-meet' && (
                            <>
                              <span>·</span>
                              <span className="text-[#25d366] font-medium">Google Meet</span>
                            </>
                          )}
                          {dur && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[#00a884]">{dur}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {call.provider === 'google-meet' && call.meetUri && (
                        <a
                          href={call.meetUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-11 items-center gap-1 rounded-xl bg-[#00a884]/15 border border-[#00a884]/35 px-3 text-xs font-semibold text-[#25d366] hover:bg-[#00a884] hover:text-[#0b141a] transition"
                          title="Open Google Meet room"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Join</span>
                        </a>
                      )}
                      {peerId && peerId !== user?.uid && (
                        <button
                          type="button"
                          onClick={() => void handleOpenDirectChat(peerId)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef] transition"
                          title={`Message ${peerName}`}
                          aria-label={`Message ${peerName}`}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handlePlaceCall(peerId, peerName, peerPhoto, call.callType)
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#202c33] text-[#00a884] hover:bg-[#00a884] hover:text-[#0b141a] transition"
                        title={`Call back (${call.callType})`}
                        aria-label={`Call back ${peerName}`}
                      >
                        {call.callType === 'video' ? (
                          <Video className="h-4 w-4" />
                        ) : (
                          <Phone className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!user?.uid) return;
                          await hideCallFromHistory(call.id, user.uid);
                          showToast('Removed from call log', 'info');
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#202c33] text-[#8696a0] hover:bg-rose-500/15 hover:text-rose-400 transition"
                        title="Remove call entry"
                        aria-label="Remove call entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-xs text-[#8696a0]/70 flex items-center justify-center gap-1.5 border-t border-[#222d34]/40">
          <Sparkles className="h-3.5 w-3.5 text-[#00a884]" />
          <span>DEV CHAT Voice & Google Meet Video Calls • Developed by <strong className="text-[#00a884]">lawrencedev</strong></span>
        </div>
      </div>

      {/* Call Modal */}
      {activeCall && (
        <CallModal
          isOpen={true}
          onClose={() => setActiveCall(null)}
          contactName={activeCall.contactName}
          contactPhoto={activeCall.contactPhoto}
          callType={activeCall.callType}
          callSessionId={activeCall.sessionId}
        />
      )}

      {/* Google Meet Modal */}
      {activeMeetCall && (
        <GoogleMeetModal
          isOpen={true}
          onClose={() => setActiveMeetCall(null)}
          title={activeMeetCall.contactName}
          photoURL={activeMeetCall.contactPhoto}
          targetUid={activeMeetCall.targetUid}
          targetName={activeMeetCall.targetUid ? activeMeetCall.contactName : undefined}
        />
      )}

      {/* Clear Call Log Confirmation */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        loading={clearingCalls}
        onConfirm={async () => {
          if (!user?.uid) return;
          setClearingCalls(true);
          try {
            await clearUserCallHistory(
              callHistory.map((c) => c.id),
              user.uid
            );
            showToast('Call history cleared', 'info');
          } finally {
            setClearingCalls(false);
            setShowClearConfirm(false);
          }
        }}
        title="Clear recent call logs?"
        description="This removes all call log entries from your view."
        confirmText="Clear logs"
        variant="danger"
      />
    </div>
  );
};
