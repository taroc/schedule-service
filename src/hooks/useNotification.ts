import { useToast, Toast } from './useToast';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

// Backwards compatibility interface
interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export const useNotification = () => {
  const { toasts, addToast, removeToast, clearAll, success, error, info, warning } = useToast();

  // Convert toasts to notifications for backwards compatibility
  const notifications: Notification[] = toasts.map((toast: Toast) => ({
    id: toast.id,
    message: toast.message,
    type: toast.type,
    duration: toast.duration
  }));

  const showNotification = (
    message: string, 
    type: NotificationType = 'info', 
    duration = 5000
  ) => {
    return addToast({ message, type, duration });
  };

  const removeNotification = (id: string) => {
    removeToast(id);
  };

  const showSuccess = (message: string, duration?: number) => 
    success(message, duration);

  const showError = (message: string, duration?: number) => 
    error(message, duration);

  const showInfo = (message: string, duration?: number) => 
    info(message, duration);

  const showWarning = (message: string, duration?: number) => 
    warning(message, duration);

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