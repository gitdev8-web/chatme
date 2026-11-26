/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { X, MessageSquare, Wifi } from 'lucide-react';
import { sound } from '../hooks/useSound';
import { Avatar } from '../components/common/Avatar';

export type NotificationKind = 'message' | 'online' | 'call' | 'system';

export interface InAppNotificationPayload {
  id: string;
  kind?: NotificationKind;
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
  toasts: InAppNotificationPayload[];
  dismissToast: (id?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  });

  const [toasts, setToasts] = useState<InAppNotificationPayload[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
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

  const dismissToast = useCallback((id?: string) => {
    if (!id) {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
      setToasts([]);
      return;
    }
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (payload: Omit<InAppNotificationPayload, 'id'>) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const kind: NotificationKind = payload.kind || 'message';
      const showPreviews =
        typeof window === 'undefined' || localStorage.getItem('devchat_notif_previews') !== 'false';
      const displayBody =
        kind === 'message' && !showPreviews ? 'New message received' : payload.body;
      const fullPayload: InAppNotificationPayload = {
        ...payload,
        kind,
        body: displayBody,
        id,
      };

      // 1. Play distinct audio cue
      if (kind === 'online') {
        sound.playPop();
      } else {
        sound.playReceive();
      }

      // 2. Stack up to 3 floating popup banners (newest first)
      setToasts((prev) => {
        const deduped = payload.conversationId && kind === 'message'
          ? prev.filter((t) => t.conversationId !== payload.conversationId || t.kind !== 'message')
          : prev;
        const next = [fullPayload, ...deduped];
        if (next.length > 3) {
          const dropped = next.slice(3);
          dropped.forEach((d) => {
            const tm = timersRef.current.get(d.id);
            if (tm) {
              clearTimeout(tm);
              timersRef.current.delete(d.id);
            }
          });
        }
        return next.slice(0, 3);
      });

      const autoDismissMs = kind === 'online' ? 4200 : 5200;
      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, autoDismissMs);
      timersRef.current.set(id, timer);

      // 3. Out-of-App OS / Browser Notification when window is hidden or unfocused
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
          const nativeNotif = new Notification(
            kind === 'online' ? `${payload.title} is online` : payload.title,
            {
              body: kind === 'online' ? 'Tap to open DEV CHAT' : displayBody,
              icon: payload.icon || '/logo.png',
              tag: payload.conversationId || (kind === 'online' ? `online-${payload.title}` : 'devchat-msg'),
            }
          );

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
        activeToast: toasts[0] || null,
        toasts,
        dismissToast,
      }}
    >
      {children}

      {/* Responsive Floating In-App Message & Online Popup Banners */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed top-3 left-3 right-3 sm:top-4 sm:left-auto sm:right-4 sm:w-[380px] z-[9999] flex flex-col gap-2.5 pointer-events-none safe-top"
        >
          {toasts.map((toast) => {
            const isOnlineNotif = toast.kind === 'online';
            return (
              <div
                key={toast.id}
                role="status"
                onClick={() => {
                  if (toast.onClick) {
                    toast.onClick();
                    dismissToast(toast.id);
                  }
                }}
                className={`pointer-events-auto bg-[#182229] border ${
                  isOnlineNotif ? 'border-[#25d366]/45' : 'border-[#00a884]/45'
                } text-[#e9edef] rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-3 flex items-start gap-3 select-none ${
                  toast.onClick ? 'cursor-pointer hover:bg-[#202c33] transition-colors' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={toast.icon}
                    name={toast.senderName || toast.title}
                    size="md"
                    isOnline={isOnlineNotif}
                    showPresence={false}
                    className={isOnlineNotif ? 'ring-2 ring-[#25d366]' : 'ring-2 ring-[#00a884]/70'}
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#182229] ${
                      isOnlineNotif
                        ? 'bg-[#25d366] text-[#0b141a]'
                        : 'bg-[#00a884] text-[#0b141a]'
                    }`}
                  >
                    {isOnlineNotif ? (
                      <Wifi className="h-2.5 w-2.5" />
                    ) : (
                      <MessageSquare className="h-2.5 w-2.5" />
                    )}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-[#e9edef] truncate">
                      {toast.title}
                    </h4>
                    <span className="text-[10px] font-medium text-[#25d366] flex-shrink-0">
                      {isOnlineNotif ? 'Online' : 'Now'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8696a0] line-clamp-2 mt-0.5 leading-snug break-words">
                    {toast.body}
                  </p>
                  {toast.onClick && (
                    <span className="mt-1.5 inline-block text-[11px] font-semibold text-[#00a884]">
                      {isOnlineNotif ? 'Tap to chat →' : 'Tap to open chat →'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(toast.id);
                  }}
                  aria-label="Dismiss notification"
                  className="flex h-8 w-8 -mr-1 -mt-1 flex-shrink-0 items-center justify-center rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
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
