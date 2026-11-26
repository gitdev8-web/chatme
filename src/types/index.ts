/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  email?: string;
  phoneNumber?: string;
  displayName: string;
  username: string;
  photoURL?: string;
  bio?: string;
  status?: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
  showOnlineStatus?: boolean;
  showLastSeen?: boolean;
  readReceipts?: boolean;
  enterToSend?: boolean;
  theme?: 'dark' | 'light' | 'system';
  blockedUserIds?: string[];
  isDisabled?: boolean;
}

export type ConversationType = 'direct' | 'group';

export interface LastMessageInfo {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'poll' | 'location' | 'contact' | 'meet' | 'system';
  readBy?: string[];
  deliveredTo?: string[];
}

export interface PinnedMessageInfo {
  messageId: string;
  text: string;
  senderName: string;
  type: MessageType;
  pinnedBy: string;
  pinnedAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participantIds: string[];
  name?: string;
  description?: string;
  photoURL?: string;
  adminIds?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  pinnedBy?: string[];
  mutedBy?: string[];
  archivedBy?: string[];
  deletedForUsers?: string[];
  clearedAt?: Record<string, string>;
  disappearingDuration?: number; // seconds, 0 = off
  pinnedMessage?: PinnedMessageInfo | null;
  lastMessage?: LastMessageInfo;
  unreadCounts?: Record<string, number>;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'voice'
  | 'poll'
  | 'location'
  | 'contact'
  | 'meet'
  | 'system';

export interface ReplyReference {
  messageId: string;
  senderName: string;
  text: string;
  type: MessageType;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user UIDs
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  label?: string;
  address?: string;
}

export interface SharedContactData {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string;
  phoneNumber?: string;
}

export interface MeetInviteData {
  meetingUri: string;
  meetingCode: string;
  spaceName: string;
  callId?: string;
  hostName?: string;
  accessType?: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  text: string;
  type: MessageType;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isForwarded?: boolean;
  viewOnce?: boolean;
  viewedBy?: string[];
  deletedFor?: string[];
  replyTo?: ReplyReference | null;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  audioDuration?: number;
  poll?: PollData;
  location?: LocationData;
  contactCard?: SharedContactData;
  meet?: MeetInviteData;
  reactions?: Record<string, string[]>; // emoji: [uid1, uid2...]
  starredBy?: string[];
  readBy?: string[];
  deliveredTo?: string[];
}

export interface TypingStatus {
  userId: string;
  displayName: string;
  timestamp: number;
  activity?: 'typing' | 'recording';
}

export interface UserStatusStory {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  type: 'text' | 'image';
  text?: string;
  caption?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  fontFamily?: string;
  createdAt: string;
  expiresAt: string;
  viewedBy: string[]; // user UIDs
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  messageId?: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AdminRole {
  role: 'admin' | 'moderator';
  email: string;
  assignedAt: string;
}

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  receiverId: string;
  receiverName?: string;
  callType: 'audio' | 'video';
  provider?: 'webrtc' | 'google-meet';
  meetUri?: string;
  meetCode?: string;
  meetSpaceName?: string;
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  offer?: { type: string; sdp: string; by?: 'caller' | 'receiver' };
  answer?: { type: string; sdp: string; by?: 'caller' | 'receiver' };
  callerIce?: string[];
  receiverIce?: string[];
}
