/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { SystemSettings } from '../../types/admin';
import { getSystemSettings, updateSystemSettings } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';

export const AdminSettingsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<SystemSettings>({
    appName: 'DEV CHAT',
    maintenanceMode: false,
    registrationOpen: true,
    voiceCallsEnabled: true,
    videoCallsEnabled: true,
    statusStoriesEnabled: true,
    maxFileSizeMb: 25,
    maxGroupMembers: 256,
    moderationStrictness: 'standard',
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  const fetchSettingsData = async () => {
    setLoading(true);
    try {
      const data = await getSystemSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateSystemSettings(settings, {
        id: user.uid,
        email: user.email || 'admin@devchat.app',
      });
      showToast('Global platform settings saved successfully', 'success');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmMaintenanceToggle = async () => {
    if (!user) return;
    const willEnable = !settings.maintenanceMode;
    const newSettings = { ...settings, maintenanceMode: willEnable };
    setSettings(newSettings);
    setShowMaintenanceConfirm(false);
    await updateSystemSettings(newSettings, {
      id: user.uid,
      email: user.email || 'admin@devchat.app',
    });
    showToast(
      willEnable ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
      willEnable ? 'info' : 'success'
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[#00a884]" />
          <span>Global Platform Configuration & Security Controls</span>
        </h2>
        <p className="text-xs text-[#8696a0] mt-0.5">
          Configure application parameters, media limits, feature gates, and emergency maintenance controls.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Core Parameters */}
        <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-white uppercase tracking-wider text-[11px] border-b border-[#202c33] pb-2">
            General Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider">
                Application Brand Name
              </label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full rounded-xl bg-[#111b21] border border-[#202c33] px-3.5 py-2.5 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider">
                Max Media File Size (MB)
              </label>
              <input
                type="number"
                min={5}
                max={100}
                value={settings.maxFileSizeMb}
                onChange={(e) =>
                  setSettings({ ...settings, maxFileSizeMb: parseInt(e.target.value) || 25 })
                }
                className="w-full rounded-xl bg-[#111b21] border border-[#202c33] px-3.5 py-2.5 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Feature Switches */}
        <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-white uppercase tracking-wider text-[11px] border-b border-[#202c33] pb-2">
            Feature Gates & Permissions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                title: 'User Registration',
                desc: 'Allow new user registration via email or phone',
                key: 'registrationOpen',
                value: settings.registrationOpen,
              },
              {
                title: '1-to-1 Voice Calling',
                desc: 'Enable WebRTC audio calls between contacts',
                key: 'voiceCallsEnabled',
                value: settings.voiceCallsEnabled,
              },
              {
                title: '1-to-1 Video Calling',
                desc: 'Enable HD video stream connections',
                key: 'videoCallsEnabled',
                value: settings.videoCallsEnabled,
              },
              {
                title: '24-Hour Status Stories',
                desc: 'Allow posting ephemeral media and text updates',
                key: 'statusStoriesEnabled',
                value: settings.statusStoriesEnabled,
              },
            ].map((gate) => (
              <label
                key={gate.key}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#111b21] border border-[#202c33] hover:border-[#00a884]/40 cursor-pointer transition"
              >
                <div className="space-y-0.5 pr-2">
                  <span className="font-bold text-white block">{gate.title}</span>
                  <span className="text-[11px] text-[#8696a0] block">{gate.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={gate.value}
                  onChange={(e) =>
                    setSettings({ ...settings, [gate.key]: e.target.checked })
                  }
                  className="h-5 w-5 rounded accent-[#00a884] cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Emergency Maintenance Mode */}
        <div className="bg-[#0c1317] border border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
              Platform Maintenance Mode
            </h3>
          </div>
          <p className="text-[#8696a0] leading-relaxed">
            When enabled, non-admin users will see an active maintenance advisory screen and message
            sending will be temporarily locked.
          </p>

          <button
            type="button"
            onClick={() => setShowMaintenanceConfirm(true)}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              settings.maintenanceMode
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
            }`}
          >
            {settings.maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </button>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-bold text-xs shadow-lg shadow-[#00a884]/20 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            <span>{saving ? 'Saving...' : 'Save Settings Changes'}</span>
          </button>
        </div>
      </form>

      {/* Maintenance Confirmation Modal */}
      {showMaintenanceConfirm && (
        <Modal
          isOpen={showMaintenanceConfirm}
          onClose={() => setShowMaintenanceConfirm(false)}
          title="Confirm Maintenance Toggle"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs select-none">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <span>
                {settings.maintenanceMode
                  ? 'Disable maintenance mode and allow all normal traffic?'
                  : 'Enable maintenance mode? Ordinary users will see an in-app service notice.'}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMaintenanceConfirm(false)}
                className="px-3.5 py-2 rounded-xl bg-[#202c33] text-[#8696a0] hover:text-white font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMaintenanceToggle}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#111b21] font-bold transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
