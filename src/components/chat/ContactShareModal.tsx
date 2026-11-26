/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Search, Send, Loader2, X } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { SharedContactData, UserProfile } from '../../types';

interface ContactShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareContact: (contact: SharedContactData) => Promise<void>;
}

export const ContactShareModal: React.FC<ContactShareModalProps> = ({
  isOpen,
  onClose,
  onShareContact,
}) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingUid, setSendingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    getDocs(query(collection(db, 'users'), limit(50)))
      .then((snap) => {
        if (!active) return;
        const list: UserProfile[] = [];
        snap.forEach((docSnap) => {
          const u = docSnap.data() as UserProfile;
          const uid = u.uid || docSnap.id;
          if (uid && uid !== user?.uid && !u.isDisabled) {
            list.push({ ...u, uid });
          }
        });
        setContacts(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, user?.uid]);

  const filtered = contacts.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.displayName || '').toLowerCase().includes(q) ||
      (c.username || '').toLowerCase().includes(q)
    );
  });

  const handleSelect = async (contact: UserProfile) => {
    setSendingUid(contact.uid);
    try {
      await onShareContact({
        uid: contact.uid,
        displayName: contact.displayName || 'DEV CHAT User',
        username: contact.username || 'user',
        photoURL: contact.photoURL || '',
        phoneNumber: contact.phoneNumber || '',
      });
      onClose();
    } finally {
      setSendingUid(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Contact"
      subtitle="Send a DEV CHAT contact card to this conversation"
      maxWidth="sm"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contacts..."
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-9 pr-9 py-2.5 text-[16px] sm:text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear contact search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-white p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-xs text-[#8696a0]">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#00a884]" />
              Loading contacts...
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#8696a0]">
              No contacts match your search.
            </p>
          ) : (
            filtered.map((contact) => (
              <div
                key={contact.uid}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#222d34]/70 bg-[#202c33]/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={contact.photoURL}
                    name={contact.displayName || 'User'}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#e9edef] truncate">
                      {contact.displayName}
                    </p>
                    <p className="text-[11px] text-[#8696a0] truncate">
                      @{contact.username}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={sendingUid === contact.uid}
                  onClick={() => handleSelect(contact)}
                  className="min-h-[38px] flex items-center gap-1 rounded-xl bg-[#00a884] px-3 py-1.5 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] disabled:opacity-50 transition flex-shrink-0"
                >
                  {sendingUid === contact.uid ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Share</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
