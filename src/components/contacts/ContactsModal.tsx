/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Search, MessageSquare, Loader2, Bookmark } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';
import { StatusViewerModal } from '../status/StatusViewerModal';
import { isUserOnline } from '../../utils/presenceUtils';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const { startDirectChat, statusStories } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChatUid, setStartingChatUid] = useState<string | null>(null);
  const [activeStoriesToView, setActiveStoriesToView] = useState<any[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Fetch recent users or search
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(30));

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
        if (isMounted) {
          setUsersList(list);
        }
      } catch (err) {
        console.warn('Notice fetching users:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  const filteredUsers = (usersList || []).filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const dName = (u?.displayName || '').toLowerCase();
    const uName = (u?.username || '').toLowerCase();
    const email = (u?.email || '').toLowerCase();
    const phone = (u?.phoneNumber || '').toLowerCase();
    return (
      dName.includes(term) ||
      uName.includes(term) ||
      email.includes(term) ||
      phone.includes(term)
    );
  });

  const handleStartChat = async (targetUid: string) => {
    if (!targetUid) return;
    setStartingChatUid(targetUid);
    try {
      await startDirectChat(targetUid);
      onClose();
    } catch (err) {
      console.error('Error starting direct chat:', err);
    } finally {
      setStartingChatUid(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start a New Chat"
      subtitle="Find people by name or @username to start messaging"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, username or email..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-800/70 pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            autoFocus
          />
        </div>

        {/* User list */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {user?.uid &&
            (!searchTerm.trim() ||
              'saved messages you notes'.includes(searchTerm.trim().toLowerCase()) ||
              (profile?.displayName || '').toLowerCase().includes(searchTerm.trim().toLowerCase())) && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#00a884]/10 hover:bg-[#00a884]/15 transition border border-[#00a884]/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={profile?.photoURL || user.photoURL || undefined}
                      name={profile?.displayName || 'You'}
                      size="md"
                      showPresence={false}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] ring-2 ring-[#111b21]">
                      <Bookmark className="h-2.5 w-2.5 fill-current" />
                    </span>
                  </div>
                  <div className="min-w-0 truncate">
                    <h4 className="text-xs font-semibold text-slate-200 truncate">
                      Saved Messages (You)
                    </h4>
                    <p className="text-[11px] text-emerald-400 truncate">
                      Personal space for notes, code & files
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleStartChat(user.uid)}
                  disabled={startingChatUid === user.uid}
                  className="flex items-center gap-1.5 rounded-xl bg-[#00a884] px-3.5 py-1.5 text-xs font-semibold text-[#0b141a] shadow-md hover:bg-[#06cf9c] disabled:opacity-50 transition"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>{startingChatUid === user.uid ? 'Opening...' : 'Open'}</span>
                </button>
              </div>
            )}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-xs text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-emerald-500" />
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              {searchTerm ? 'No users found matching your search.' : 'No other users found.'}
            </div>
          ) : (
            filteredUsers.map((u, index) => {
              const uniqueKey = u.uid || `user-${u.username || index}`;
              const userStories = statusStories.filter((s) => s.userId === u.uid);
              const hasStories = userStories.length > 0;

              return (
                <div
                  key={uniqueKey}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 transition border border-slate-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-0.5 rounded-full ${
                        hasStories
                          ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 ring-2 ring-emerald-500/50 cursor-pointer hover:scale-105'
                          : ''
                      }`}
                      onClick={() => {
                        if (hasStories) {
                          setActiveStoriesToView(userStories);
                          setIsViewerOpen(true);
                        }
                      }}
                      title={hasStories ? `View ${u.displayName}'s status update` : undefined}
                    >
                      <Avatar
                        src={u.photoURL}
                        name={u.displayName || 'User'}
                        size="md"
                        isOnline={isUserOnline(u)}
                        showPresence={true}
                      />
                    </div>
                    <div className="min-w-0 truncate">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {u.displayName || 'DEV CHAT User'}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">@{u.username || 'user'}</p>
                      {u.bio && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{u.bio}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartChat(u.uid)}
                    disabled={startingChatUid === u.uid}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{startingChatUid === u.uid ? 'Opening...' : 'Message'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Story Viewer Modal */}
      <StatusViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        stories={activeStoriesToView}
      />
    </Modal>
  );
};
