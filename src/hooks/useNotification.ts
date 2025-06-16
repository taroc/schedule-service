import { useState, useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showNotification = useCallback((
    message: string, 
    type: NotificationType = 'info', 
    duration = 5000
  ) => {
    const id = Math.random().toString(36).substring(2);
    const notification: Notification = {
      id,
      message,
      type,
      duration
    };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  const showSuccess = useCallback((message: string, duration?: number) => 
    showNotification(message, 'success', duration), [showNotification]);

  const showError = useCallback((message: string, duration?: number) => 
    showNotification(message, 'error', duration), [showNotification]);

  const showInfo = useCallback((message: string, duration?: number) => 
    showNotification(message, 'info', duration), [showNotification]);

  const showWarning = useCallback((message: string, duration?: number) => 
    showNotification(message, 'warning', duration), [showNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    removeNotification,
    clearAll
  };
};