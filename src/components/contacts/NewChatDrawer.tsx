/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Search,
  Users,
  Layers,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { isUserOnline } from '../../utils/presenceUtils';

interface NewChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateGroup: () => void;
}

export const NewChatDrawer: React.FC<NewChatDrawerProps> = ({
  isOpen,
  onClose,
  onOpenCreateGroup,
}) => {
  const { user } = useAuth();
  const { startDirectChat } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingUid, setOpeningUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(50));
        const snap = await getDocs(q);
        const list: UserProfile[] = [];
        snap.forEach((docSnap) => {
          const u = docSnap.data() as UserProfile;
          const uid = u?.uid || docSnap.id;
          if (uid && uid !== user?.uid) {
            list.push({
              ...u,
              uid,
              displayName: u?.displayName || 'DEV CHAT User',
              username: u?.username || `user_${uid.slice(0, 5)}`,
            });
          }
        });
        if (isMounted) setUsersList(list);
      } catch (err) {
        console.warn('Error fetching contacts:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const filteredUsers = (usersList || []).filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const dName = (u?.displayName || '').toLowerCase();
    const uName = (u?.username || '').toLowerCase();
    return dName.includes(term) || uName.includes(term);
  });

  const handleSelectContact = async (uid: string) => {
    if (!uid) return;
    setOpeningUid(uid);
    try {
      await startDirectChat(uid);
      onClose();
    } catch (err) {
      console.error('Error starting chat:', err);
    } finally {
      setOpeningUid(null);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#111b21] transition-transform duration-300 select-none animate-in slide-in-from-left">
      {/* New Chat Header */}
      <div className="flex h-28 items-end bg-[#202c33] px-5 pb-4">
        <div className="flex items-center gap-6 text-[#e9edef]">
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[#e9edef] hover:bg-[#111b21]/50 transition"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-semibold">New chat</h2>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="p-3 border-b border-[#222d34] bg-[#111b21]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name or username"
            className="w-full rounded-lg border border-transparent bg-[#202c33] pl-10 pr-4 py-2 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
            autoFocus
          />
        </div>
      </div>

      {/* Quick Action Rows */}
      <div className="border-b border-[#222d34]">
        <div
          onClick={() => {
            onClose();
            onOpenCreateGroup();
          }}
          className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-[#202c33] transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Users className="h-5 w-5" />
          </div>
          <span className="text-sm font-normal text-[#e9edef]">New group</span>
        </div>

        <div
          onClick={() => {
            onClose();
            onOpenCreateGroup();
          }}
          className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-[#202c33] transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-sm font-normal text-[#e9edef]">New community</span>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/60">
        <div className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#00a884]">
          Contacts on DEV CHAT
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-xs text-[#8696a0]">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#00a884]" />
            Loading contacts...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8696a0]">
            {searchTerm ? 'No contacts found.' : 'No other contacts online.'}
          </div>
        ) : (
          filteredUsers.map((u) => {
            return (
              <div
                key={u.uid}
                onClick={() => handleSelectContact(u.uid)}
                className="flex items-center gap-3.5 px-5 py-3 cursor-pointer hover:bg-[#202c33] transition"
              >
                <Avatar
                  src={u.photoURL}
                  name={u.displayName || 'User'}
                  size="md"
                  isOnline={isUserOnline(u)}
                  showPresence={true}
                />
                <div className="min-w-0 flex-1 truncate">
                  <h4 className="text-xs font-semibold text-[#e9edef] truncate">
                    {u.displayName || 'DEV CHAT User'}
                  </h4>
                  <p className="text-[11px] text-[#8696a0] truncate mt-0.5">
                    {u.bio || 'Hey there! I am using DEV CHAT.'}
                  </p>
                </div>
                {openingUid === u.uid && (
                  <Loader2 className="h-4 w-4 animate-spin text-[#00a884]" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
