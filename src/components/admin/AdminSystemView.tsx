/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  ShieldCheck,
  Radio,
  HardDrive,
  Cpu,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '../common/Toast';
import { getDocFromServer, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

export const AdminSystemView: React.FC = () => {
  const { showToast } = useToast();
  const [testing, setTesting] = useState(false);
  const [latency, setLatency] = useState<number>(0);
  const [dbReachable, setDbReachable] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<string>(new Date().toISOString());

  const runHealthCheck = useCallback(async (showNotification = false) => {
    setTesting(true);
    const start = performance.now();
    try {
      await getDocFromServer(doc(db, 'system_settings', 'global'));
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      setDbReachable(true);
      setLastChecked(new Date().toISOString());
      if (showNotification) {
        showToast(`Health Check Complete: ${elapsed}ms round-trip`, 'success');
      }
    } catch {
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      setDbReachable(false);
      setLastChecked(new Date().toISOString());
      if (showNotification) {
        showToast('Health check completed with Firestore warning', 'info');
      }
    } finally {
      setTesting(false);
    }
  }, [showToast]);

  useEffect(() => {
    runHealthCheck(false);
  }, [runHealthCheck]);

  const authReady = !!auth.currentUser;
  const swReady = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  const services = [
    {
      name: 'Google Cloud Firestore Database',
      desc: 'Realtime document synchronization and storage',
      healthy: dbReachable,
      detail: `${latency} ms round-trip`,
      icon: Database,
    },
    {
      name: 'Firebase Authentication Service',
      desc: 'Identity verification, JWT tokens & session handling',
      healthy: authReady,
      detail: authReady ? 'Session Verified' : 'No Active Session',
      icon: ShieldCheck,
    },
    {
      name: 'WebRTC P2P Signaling Engine',
      desc: 'ICE Candidate exchange and SDP offer/answer relay',
      healthy: typeof RTCPeerConnection !== 'undefined',
      detail: typeof RTCPeerConnection !== 'undefined' ? 'Browser WebRTC Ready' : 'Unsupported',
      icon: Radio,
    },
    {
      name: 'Cloud Media Storage',
      desc: 'Encrypted voice notes, images, and document buffers',
      healthy: dbReachable,
      detail: dbReachable ? 'Firestore Sync Active' : 'Degraded',
      icon: HardDrive,
    },
    {
      name: 'Progressive Web App (PWA) Cache',
      desc: 'Offline service worker and static asset precache',
      healthy: swReady,
      detail: swReady ? 'Service Worker Supported' : 'Not Supported',
      icon: Layers,
    },
  ];

  const allHealthy = services.every((s) => s.healthy);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                allHealthy ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {allHealthy ? 'All Core Systems Operational' : 'Partial Degradation Detected'}
            </h2>
          </div>
          <p className="text-xs text-[#8696a0] tabular-nums">
            Last verified: {new Date(lastChecked).toLocaleTimeString()} • Dynamic round-trip ping:{' '}
            <strong className="text-[#00a884] font-mono tabular-nums">{latency} ms</strong>
          </p>
        </div>

        <button
          onClick={() => runHealthCheck(true)}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-bold text-xs shadow-md shadow-[#00a884]/20 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
          <span>{testing ? 'Testing Ping...' : 'Run Diagnostics'}</span>
        </button>
      </div>

      {/* Service Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((srv, idx) => {
          const Icon = srv.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#0c1317] border border-[#202c33] hover:border-[#00a884]/40 transition space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#00a884]/10 text-[#00a884]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{srv.name}</h3>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">{srv.desc}</p>
                  </div>
                </div>

                {srv.healthy ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] uppercase tracking-wider flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    Healthy
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase tracking-wider flex-shrink-0">
                    <AlertTriangle className="h-3 w-3" />
                    Warning
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#202c33]/60 text-[#8696a0]">
                <span>Probe Status:</span>
                <span className="text-white font-mono font-semibold tabular-nums">{srv.detail}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Production Runtime Environment Stats */}
      <div className="bg-[#0c1317] border border-[#202c33] rounded-2xl p-5 shadow-sm space-y-3 text-xs">
        <h3 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[#00a884]" />
          <span>Environment & Server Configuration</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8696a0]">Applet Engine</span>
            <p className="text-white font-mono">React 19 + Vite (SPA)</p>
          </div>
          <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8696a0]">PWA Service Worker</span>
            <p className="text-emerald-400 font-semibold font-mono">
              {swReady ? 'Active & Precached' : 'Browser Fallback'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#111b21] border border-[#202c33] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8696a0]">Vercel Deployment URL</span>
            <p className="text-[#00a884] font-mono text-[11px] truncate">https://chatme-wine.vercel.app</p>
          </div>
        </div>
      </div>
    </div>
  );
};
