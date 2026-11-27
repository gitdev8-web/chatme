/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, AtSign, User, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';
import { uploadFileWithProgress } from '../../services/storageService';
import { compressAvatarImage } from '../../utils/imageUtils';

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
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync fields cleanly whenever modal opens
  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.displayName || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setStatus(profile.status || 'Available');
      setPhotoURL(profile.photoURL || '');
      setAvatarFile(null);
      setAvatarPreview('');
      setPhotoRemoved(false);
      setError(null);
      setUsernameStatus('idle');
    }
  }, [isOpen, profile?.uid]);

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

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setError(null);
    try {
      const compressed = await compressAvatarImage(file);
      setAvatarFile(compressed.file);
      setAvatarPreview(compressed.dataUrl);
      setPhotoRemoved(false);
    } catch {
      setError('Could not process selected image. Please try another photo.');
    }
  };

  const handleRemovePhoto = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setPhotoURL('');
    setPhotoRemoved(true);
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
      let finalPhotoURL = photoRemoved ? '' : photoURL;
      if (avatarFile && user) {
        try {
          const uploadRes = await uploadFileWithProgress(
            avatarFile,
            `avatars/${user.uid}`,
            `avatar_${user.uid}_${Date.now()}.jpg`
          );
          finalPhotoURL = uploadRes.url || avatarPreview || finalPhotoURL;
        } catch {
          if (avatarPreview && avatarPreview.length <= 220_000) {
            finalPhotoURL = avatarPreview;
          } else {
            throw new Error('Could not upload profile photo. Please try a smaller image.');
          }
        }
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

  const displayedPhoto = photoRemoved ? '' : avatarPreview || photoURL;

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

        <div className="flex flex-col items-center justify-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer"
          >
            <Avatar
              src={displayedPhoto}
              name={displayName || 'User'}
              size="xl"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFile}
              className="hidden"
            />
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#202c33] px-2.5 py-1 text-[11px] font-medium text-[#00a884] hover:bg-[#2a3942] transition"
            >
              <Camera className="h-3 w-3" />
              <span>{displayedPhoto ? 'Change photo' : 'Upload photo'}</span>
            </button>
            {displayedPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1 rounded-lg bg-[#202c33] px-2.5 py-1 text-[11px] font-medium text-rose-400 hover:bg-[#2a3942] transition"
              >
                <Trash2 className="h-3 w-3" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#e9edef]">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0]" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-9 pr-3 py-2 text-xs text-[#e9edef] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#e9edef]">Username</label>
              {usernameStatus === 'available' && (
                <span className="text-[10px] text-[#25d366]">Available</span>
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
                className="w-full rounded-xl border border-[#222d34] bg-[#202c33] pl-9 pr-3 py-2 text-xs text-[#e9edef] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#e9edef]">Bio</label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={140}
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] p-2.5 text-xs text-[#e9edef] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#e9edef]">Status Message</label>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2 text-xs text-[#e9edef] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] mb-2"
          />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setStatus(preset)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  status === preset
                    ? 'bg-[#00a884]/20 text-[#25d366] ring-1 ring-[#00a884]/40'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
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
            className="rounded-xl bg-[#202c33] px-4 py-2 text-xs font-medium text-[#8696a0] hover:text-[#e9edef] transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#00a884] px-5 py-2 text-xs font-bold text-[#0b141a] shadow-md hover:bg-[#06cf9c] disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
