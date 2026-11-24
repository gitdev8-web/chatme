/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { X, MessageSquare, Bell } from 'lucide-react';
import { sound } from '../hooks/useSound';

export interface InAppNotificationPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
  conversationId?: string;
  senderName?: string;
  onClick?: () => void;
}

interface NotificationContextType {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  notify: (payload: Omit<InAppNotificationPayload, 'id'>) => void;
  activeToast: InAppNotificationPayload | null;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  });

  const [activeToast, setActiveToast] = useState<InAppNotificationPayload | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      return res;
    } catch {
      return 'denied';
    }
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const notify = useCallback(
    (payload: Omit<InAppNotificationPayload, 'id'>) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const showPreviews =
        typeof window === 'undefined' || localStorage.getItem('devchat_notif_previews') !== 'false';
      const displayBody = showPreviews ? payload.body : 'New message received';
      const fullPayload: InAppNotificationPayload = { ...payload, body: displayBody, id };

      // 1. Play audio chime
      sound.playReceive();

      // 2. In-App Toast Banner
      setActiveToast(fullPayload);

      // Auto-dismiss in-app toast after 5 seconds
      setTimeout(() => {
        setActiveToast((current) => (current?.id === id ? null : current));
      }, 5000);

      // 3. Out-of-App Push Notification
      const isWindowUnfocused =
        document.visibilityState === 'hidden' ||
        (typeof document.hasFocus === 'function' && !document.hasFocus());

      if (
        isWindowUnfocused &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          const nativeNotif = new Notification(payload.title, {
            body: displayBody,
            icon: payload.icon || '/favicon.ico',
            tag: payload.conversationId || 'devchat-msg',
          });

          nativeNotif.onclick = () => {
            window.focus();
            if (payload.onClick) {
              payload.onClick();
            }
            nativeNotif.close();
          };
        } catch {
          // System notification fallback
        }
      }
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        permission,
        requestPermission,
        notify,
        activeToast,
        dismissToast,
      }}
    >
      {children}

      {/* Floating In-App Banner Toast */}
      {activeToast && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full bg-[#202c33] dark:bg-[#202c33] border border-[#25d366]/40 text-[#e9edef] rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-3 duration-300 flex items-start gap-3 select-none">
          <div className="relative flex-shrink-0">
            {activeToast.icon ? (
              <img
                src={activeToast.icon}
                alt={activeToast.senderName || 'Sender'}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-[#00a884]"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white">
                <MessageSquare className="h-5 w-5" />
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#25d366] text-[#111b21]">
              <Bell className="h-2.5 w-2.5" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-[#e9edef] truncate">{activeToast.title}</h4>
            <p className="text-[11px] text-[#8696a0] truncate mt-0.5">{activeToast.body}</p>
            {activeToast.onClick && (
              <button
                onClick={() => {
                  if (activeToast.onClick) activeToast.onClick();
                  dismissToast();
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#00a884] px-2.5 py-1 text-[11px] font-semibold text-[#111b21] hover:bg-[#06cf9c] transition"
              >
                Open Chat
              </button>
            )}
          </div>

          <button
            onClick={dismissToast}
            className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-lg hover:bg-[#2a3942] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
