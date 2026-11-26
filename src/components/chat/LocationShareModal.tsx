/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapPin, Navigation, Loader2, Send } from 'lucide-react';
import { Modal } from '../common/Modal';
import { LocationData } from '../../types';

interface LocationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareLocation: (location: LocationData) => Promise<void>;
}

export const LocationShareModal: React.FC<LocationShareModalProps> = ({
  isOpen,
  onClose,
  onShareLocation,
}) => {
  const [label, setLabel] = useState('Current Location');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<string>('37.7749');
  const [longitude, setLongitude] = useState<string>('-122.4194');
  const [locating, setLocating] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsNotice('GPS unavailable in this browser. Adjust coordinates below.');
      return;
    }
    setLocating(true);
    setGpsNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLabel('Current GPS Location');
        setAddress(`Accuracy ±${Math.round(pos.coords.accuracy)}m`);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setGpsNotice('Location access denied or blocked. You can enter a place name below.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng) || sending) return;

    setSending(true);
    try {
      await onShareLocation({
        latitude: lat,
        longitude: lng,
        label: label.trim() || 'Shared Location',
        address: address.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Location"
      subtitle="Send your GPS pin or a meetup location"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={locating}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00a884]/40 bg-[#00a884]/15 px-4 py-3 text-xs font-bold text-[#25d366] hover:bg-[#00a884]/25 transition min-h-[44px]"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          <span>{locating ? 'Detecting GPS...' : 'Use Current GPS Location'}</span>
        </button>

        {gpsNotice && (
          <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            {gpsNotice}
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#8696a0] mb-1">
            Location Name
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Coffee Hub, HQ Office..."
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2.5 text-[16px] sm:text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8696a0] mb-1">
            Address / Note (optional)
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, landmark, or floor"
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2.5 text-[16px] sm:text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-[#8696a0] mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2 text-[16px] sm:text-xs font-mono text-[#e9edef] focus:border-[#00a884] focus:outline-none tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#8696a0] mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3 py-2 text-[16px] sm:text-xs font-mono text-[#e9edef] focus:border-[#00a884] focus:outline-none tabular-nums"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#222d34] bg-[#0b141a] px-3 py-2.5 text-[11px] text-[#8696a0]">
          <MapPin className="h-4 w-4 text-[#00a884] flex-shrink-0" />
          <span className="truncate font-mono tabular-nums">
            Pin: {latitude}, {longitude}
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className="min-h-[44px] flex items-center gap-1.5 rounded-xl bg-[#00a884] px-5 py-2 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] disabled:opacity-45 transition shadow-md"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{sending ? 'Sharing...' : 'Send Location'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
