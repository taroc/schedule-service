import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ToastManager from '../ToastManager';
import { useToast } from '@/hooks/useToast';

// useToast フックをモック
vi.mock('@/hooks/useToast');

describe('ToastManager', () => {
  const mockAddToast = vi.fn();
  const mockRemoveToast = vi.fn();
  const mockClearAll = vi.fn();
  
  const mockToasts = [
    {
      id: '1',
      message: 'Success message',
      type: 'success' as const,
      duration: 5000
    },
    {
      id: '2', 
      message: 'Error message',
      type: 'error' as const,
      duration: 0 // No auto dismiss
    },
    {
      id: '3',
      message: 'Info message',
      type: 'info' as const,
      duration: 3000
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({
      toasts: mockToasts,
      addToast: mockAddToast,
      removeToast: mockRemoveToast,
      clearAll: mockClearAll
    });
  });

  it('should render all toasts', () => {
    render(<ToastManager />);
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should call removeToast when close button is clicked', () => {
    render(<ToastManager />);
    
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]);
    
    // Since toasts are reversed, the first button corresponds to the last toast (id: '3')
    expect(mockRemoveToast).toHaveBeenCalledWith('3');
  });

  it('should display toasts in stack order (newest at top)', () => {
    render(<ToastManager />);
    
    const toastElements = screen.getAllByRole('alert');
    expect(toastElements).toHaveLength(3);
    
    // 最新のトースト（配列の最後）が一番上に表示される
    expect(toastElements[0]).toHaveTextContent('Info message');
    expect(toastElements[1]).toHaveTextContent('Error message');
    expect(toastElements[2]).toHaveTextContent('Success message');
  });

  it('should handle empty toasts array', () => {
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({
      toasts: [],
      addToast: mockAddToast,
      removeToast: mockRemoveToast,
      clearAll: mockClearAll
    });
    
    render(<ToastManager />);
    
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should auto-dismiss toasts with duration > 0', async () => {
    vi.useFakeTimers();
    
    render(<ToastManager />);
    
    // 5秒後にタイマーが発火することを確認
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(mockRemoveToast).toHaveBeenCalledWith('1');
    
    vi.useRealTimers();
  });

  it('should not auto-dismiss toasts with duration = 0', async () => {
    vi.useFakeTimers();
    
    render(<ToastManager />);
    
    // 十分な時間が経過してもduration=0のトーストは削除されない
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    
    expect(mockRemoveToast).not.toHaveBeenCalledWith('2');
    
    vi.useRealTimers();
  });

  it('should apply correct styling for different toast types', () => {
    render(<ToastManager />);
    
    const successToast = screen.getByText('Success message').closest('div[role="alert"]');
    const errorToast = screen.getByText('Error message').closest('div[role="alert"]');
    const infoToast = screen.getByText('Info message').closest('div[role="alert"]');
    
    expect(successToast).toHaveClass('bg-green-500');
    expect(errorToast).toHaveClass('bg-red-500');
    expect(infoToast).toHaveClass('bg-blue-500');
  });
});