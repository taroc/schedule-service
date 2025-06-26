'use client';

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number; // 0 means no auto-dismiss
}

export interface ToastOptions {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

const MAX_TOASTS = 5;
const DEFAULT_DURATION = 5000;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const addToast = useCallback((options: ToastOptions) => {
    const newToast: Toast = {
      id: generateId(),
      message: options.message,
      type: options.type,
      duration: options.duration ?? DEFAULT_DURATION
    };

    setToasts(current => {
      const updated = [...current, newToast];
      // Keep only the latest MAX_TOASTS toasts
      return updated.slice(-MAX_TOASTS);
    });

    return newToast.id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'success', duration });
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'error', duration });
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'info', duration });
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'warning', duration });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    info,
    warning
  };
}