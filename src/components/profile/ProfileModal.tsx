/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, AtSign, User, FileText, Check, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';
import { uploadFileWithProgress } from '../../services/storageService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_PRESETS = [
  'Available',
  'Busy',
  'In a meeting',
  'Working remotely',
  'At the gym',
  'Traveling',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, user, updateProfileData, checkUsernameAvailable } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [status, setStatus] = useState(profile?.status || 'Available');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const handleUsernameChange = async (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    setUsername(cleaned);

    if (cleaned === profile?.username) {
      setUsernameStatus('idle');
      return;
    }

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }

    if (usernameStatus === 'taken') {
      setError('Username is already taken.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      let finalPhotoURL = photoURL;
      if (avatarFile && user) {
        const uploadRes = await uploadFileWithProgress(
          avatarFile,
          'avatars',
          `avatar_${user.uid}.jpg`
        );
        finalPhotoURL = uploadRes.url;
      }

      await updateProfileData({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        status: status.trim(),
        photoURL: finalPhotoURL,
      });

      showToast('Profile updated successfully!', 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      subtitle="Manage your public identity on DEV CHAT"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Avatar Upload */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative group cursor-pointer">
            <Avatar
              src={avatarPreview || photoURL}
              name={displayName || 'User'}
              size="xl"
            />
            <label className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="h-5 w-5 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
            </label>
          </div>
          <span className="text-[11px] text-slate-400 mt-2">Tap photo to change avatar</span>
        </div>

        {/* Display Name & Username */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 pl-9 pr-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Username</label>
              {usernameStatus === 'available' && (
                <span className="text-[10px] text-emerald-400">Available</span>
              )}
              {usernameStatus === 'taken' && (
                <span className="text-[10px] text-rose-400">Taken</span>
              )}
            </div>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 pl-9 pr-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300">Bio</label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={140}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 p-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Status Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Status Message</label>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-2"
          />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setStatus(preset)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  status === preset
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
