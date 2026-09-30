/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Edit2,
  Loader2,
  Smile,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { uploadFileWithProgress } from '../../services/storageService';
import { useToast } from '../common/Toast';

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

  React.useEffect(() => {
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
    } catch (err) {
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
    } catch (err) {
      showToast('Failed to update about', 'error');
    } finally {
      setBioSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingPhoto(true);
      try {
        const res = await uploadFileWithProgress(
          file,
          `profiles/${user.uid}`,
          `avatar_${Date.now()}`
        );
        if (res.url) {
          await updateProfileData({ photoURL: res.url });
          showToast('Profile photo updated', 'success');
        }
      } catch (err) {
        showToast('Failed to update photo', 'error');
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#111b21] transition-transform duration-300 select-none animate-in slide-in-from-left">
      {/* WhatsApp Profile Green Top Bar */}
      <div className="flex h-28 items-end bg-[#202c33] px-5 pb-4">
        <div className="flex items-center gap-6 text-[#e9edef]">
          <button
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
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-48 w-48 rounded-full overflow-hidden cursor-pointer shadow-2xl ring-4 ring-[#202c33] bg-[#202c33] flex items-center justify-center"
          >
            <Avatar
              src={profile?.photoURL}
              name={profile?.displayName || 'User'}
              size="2xl"
              className="h-full w-full object-cover"
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
