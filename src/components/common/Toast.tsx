/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => {
        const next = [...prev, { id, type, message }];
        if (next.length > 4) {
          const evicted = next.slice(0, next.length - 4);
          evicted.forEach((t) => {
            const tm = timersRef.current.get(t.id);
            if (tm) {
              clearTimeout(tm);
              timersRef.current.delete(t.id);
            }
          });
          return next.slice(-4);
        }
        return next;
      });

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
      timersRef.current.set(id, timer);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 sm:w-[360px] z-[9998] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 bg-[#182229] text-[#e9edef] ${
              toast.type === 'success'
                ? 'border-[#25d366]/45'
                : toast.type === 'error'
                ? 'border-rose-500/45'
                : toast.type === 'warning'
                ? 'border-amber-500/45'
                : 'border-[#53bdeb]/40'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium min-w-0">
              {toast.type === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-[#25d366] flex-shrink-0" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              )}
              {toast.type === 'warning' && (
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              )}
              {toast.type === 'info' && (
                <Info className="h-4 w-4 text-[#53bdeb] flex-shrink-0" />
              )}
              <span className="break-words leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss toast"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
