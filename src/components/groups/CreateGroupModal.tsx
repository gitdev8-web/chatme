/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Users, Camera, Search, Check, AlertCircle } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';
import { uploadFileWithProgress } from '../../services/storageService';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { createNewGroup } = useChat();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(50)));
        const list: UserProfile[] = [];
        snap.forEach((doc) => {
          const u = doc.data() as UserProfile;
          if (u.uid !== user?.uid) {
            list.push(u);
          }
        });
        setUsersList(list);
      } catch (err) {
        console.error('Error fetching users for group:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, user]);

  const toggleSelectUser = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name.');
      return;
    }
    if (selectedUids.length === 0) {
      setError('Please select at least 1 member to add.');
      return;
    }

    setError(null);
    setCreating(true);
    try {
      let finalPhotoURL = photoURL;
      if (photoFile) {
        const res = await uploadFileWithProgress(
          photoFile,
          'group_avatars',
          `group_${Date.now()}.jpg`
        );
        finalPhotoURL = res.url;
      }

      await createNewGroup(
        name.trim(),
        description.trim(),
        finalPhotoURL,
        selectedUids
      );

      // Reset
      setName('');
      setDescription('');
      setSelectedUids([]);
      setPhotoFile(null);
      setPhotoPreview('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Group"
      subtitle="Gather friends, teammates or community members"
      maxWidth="md"
    >
      <form onSubmit={handleCreate} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Group Avatar & Info */}
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer flex-shrink-0">
            <Avatar
              src={photoPreview || photoURL}
              name={name || 'Group'}
              size="lg"
            />
            <label className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="h-4 w-4 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex-1 space-y-1.5">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name (e.g. Design Team)"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description / Purpose (Optional)"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-3.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Members Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300">
              Add Members ({selectedUids.length} selected)
            </label>
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search people to add..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-xl p-2 bg-slate-900/50">
            {loading ? (
              <p className="text-center py-4 text-xs text-slate-500">Loading contacts...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-500">No users found</p>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUids.includes(u.uid);
                return (
                  <div
                    key={u.uid}
                    onClick={() => toggleSelectUser(u.uid)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-emerald-950/40 border border-emerald-500/30'
                        : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar src={u.photoURL} name={u.displayName} size="sm" />
                      <div className="truncate">
                        <span className="text-xs font-medium text-slate-200 block truncate">
                          {u.displayName}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          @{u.username}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-lg border transition ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={creating || !name.trim() || selectedUids.length === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition"
        >
          {creating ? 'Creating Group...' : 'Create Group'}
        </button>
      </form>
    </Modal>
  );
};
