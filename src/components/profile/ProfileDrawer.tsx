/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Edit2,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { uploadFileWithProgress } from '../../services/storageService';
import { useToast } from '../common/Toast';
import { compressAvatarImage } from '../../utils/imageUtils';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ABOUTS = [
  'Hey there! I am using DEV CHAT.',
  'Available',
  'Busy',
  'At work',
  'Coding away 💻',
  'In a meeting',
  'Battery about to die',
  'Can’t talk, DEV CHAT only',
  'Sleeping 😴',
  'Urgent calls only',
];

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfileData } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);

  const [bio, setBio] = useState(profile?.bio || 'Hey there! I am using DEV CHAT.');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioSaving, setBioSaving] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || 'Hey there! I am using DEV CHAT.');
    }
  }, [profile]);

  if (!isOpen || !user) return null;

  const handleSaveName = async () => {
    if (!displayName.trim() || displayName === profile?.displayName) {
      setIsEditingName(false);
      return;
    }
    setNameSaving(true);
    try {
      await updateProfileData({ displayName: displayName.trim() });
      setIsEditingName(false);
      showToast('Name updated successfully', 'success');
    } catch {
      showToast('Failed to update name', 'error');
    } finally {
      setNameSaving(false);
    }
  };

  const handleSaveBio = async (newBio?: string) => {
    const textToSave = (newBio !== undefined ? newBio : bio).trim();
    setBioSaving(true);
    try {
      await updateProfileData({ bio: textToSave });
      setIsEditingBio(false);
      setBio(textToSave);
      showToast('About updated successfully', 'success');
    } catch {
      showToast('Failed to update about', 'error');
    } finally {
      setBioSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      const compressed = await compressAvatarImage(file);
      let finalUrl = '';
      try {
        const res = await uploadFileWithProgress(
          compressed.file,
          `avatars/${user.uid}`,
          `avatar_${user.uid}_${Date.now()}.jpg`
        );
        finalUrl = res.url || compressed.dataUrl;
      } catch {
        if (compressed.dataUrl.length <= 220_000) {
          finalUrl = compressed.dataUrl;
        } else {
          throw new Error('Photo upload failed');
        }
      }

      if (!finalUrl) {
        throw new Error('Could not generate profile photo URL');
      }

      await updateProfileData({ photoURL: finalUrl });
      showToast('Profile photo updated', 'success');
    } catch {
      showToast('Failed to update profile photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (uploadingPhoto || !profile?.photoURL) return;
    setUploadingPhoto(true);
    try {
      await updateProfileData({ photoURL: '' });
      showToast('Profile photo removed', 'info');
    } catch {
      showToast('Failed to remove profile photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#111b21] transition-transform duration-300 select-none animate-in slide-in-from-left">
      {/* Profile Top Bar */}
      <div className="flex h-28 items-end bg-[#202c33] px-5 pb-4">
        <div className="flex items-center gap-6 text-[#e9edef]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#e9edef] hover:bg-[#111b21]/50 transition"
            title="Back to chats"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto px-6 py-7 space-y-7">
        {/* Photo Container */}
        <div className="flex flex-col items-center justify-center">
          <div
            onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
            className="group relative h-44 w-44 rounded-full overflow-hidden cursor-pointer shadow-2xl ring-4 ring-[#202c33] bg-[#202c33] flex items-center justify-center"
          >
            <Avatar
              src={profile?.photoURL}
              name={profile?.displayName || 'User'}
              size="3xl"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center px-4">
              <Camera className="h-7 w-7 text-white mb-1.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                Change Profile Photo
              </span>
            </div>

            {uploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <Loader2 className="h-8 w-8 animate-spin text-[#00a884]" />
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#202c33] px-3 py-1.5 text-xs font-medium text-[#00a884] hover:bg-[#2a3942] disabled:opacity-50 transition"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{profile?.photoURL ? 'Change photo' : 'Add photo'}</span>
            </button>
            {profile?.photoURL && (
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#202c33] px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-[#2a3942] disabled:opacity-50 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* Your Name Section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#00a884]">Your name</label>

          {isEditingName ? (
            <div className="flex items-center gap-2 border-b-2 border-[#00a884] pb-1">
              <input
                type="text"
                value={displayName}
                maxLength={25}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="flex-1 bg-transparent text-sm text-[#e9edef] focus:outline-none"
                autoFocus
              />
              <span className="text-[11px] text-[#8696a0]">
                {25 - displayName.length}
              </span>
              <button
                type="button"
                onClick={handleSaveName}
                disabled={nameSaving}
                className="rounded p-1 text-[#8696a0] hover:text-[#00a884] transition"
              >
                {nameSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#00a884]" />
                ) : (
                  <Check className="h-4 w-4 text-[#00a884]" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-[#222d34] pb-2">
              <span className="text-sm font-semibold text-[#e9edef]">
                {profile?.displayName || 'Set your name'}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="p-1 text-[#8696a0] hover:text-[#e9edef] transition"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-[11px] text-[#8696a0] leading-relaxed">
            This is not your username or pin. This name will be visible to your DEV CHAT contacts.
          </p>
        </div>

        {/* About Section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#00a884]">About</label>

          {isEditingBio ? (
            <div className="flex items-center gap-2 border-b-2 border-[#00a884] pb-1">
              <input
                type="text"
                value={bio}
                maxLength={100}
                onChange={(e) => setBio(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBio();
                  if (e.key === 'Escape') setIsEditingBio(false);
                }}
                className="flex-1 bg-transparent text-sm text-[#e9edef] focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleSaveBio()}
                disabled={bioSaving}
                className="rounded p-1 text-[#8696a0] hover:text-[#00a884] transition"
              >
                {bioSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#00a884]" />
                ) : (
                  <Check className="h-4 w-4 text-[#00a884]" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-[#222d34] pb-2">
              <span className="text-xs text-[#e9edef]">
                {profile?.bio || 'Hey there! I am using DEV CHAT.'}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingBio(true)}
                className="p-1 text-[#8696a0] hover:text-[#e9edef] transition"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Quick Preset Statuses */}
          <div className="pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0]">
              Select an about
            </span>
            <div className="mt-2 space-y-1">
              {PRESET_ABOUTS.map((preset) => (
                <div
                  key={preset}
                  onClick={() => handleSaveBio(preset)}
                  className={`cursor-pointer rounded-xl px-3 py-2 text-xs transition ${
                    profile?.bio === preset
                      ? 'bg-[#202c33] text-[#00a884] font-semibold'
                      : 'text-[#8696a0] hover:bg-[#202c33]/50 hover:text-[#e9edef]'
                  }`}
                >
                  {preset}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Username / Identifier */}
        <div className="space-y-1 border-t border-[#222d34] pt-4">
          <label className="text-[11px] font-medium text-[#8696a0]">Username</label>
          <p className="text-xs font-mono font-semibold text-[#e9edef]">
            @{profile?.username || 'user'}
          </p>
        </div>
      </div>
    </div>
  );
};
