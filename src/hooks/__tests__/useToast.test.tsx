import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty toasts array', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast with unique id', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast({
        message: 'Test message',
        type: 'success',
        duration: 5000
      });
    });
    
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: 'Test message',
      type: 'success',
      duration: 5000
    });
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it('should add multiple toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast({
        message: 'First message',
        type: 'success',
        duration: 5000
      });
    });
    
    act(() => {
      result.current.addToast({
        message: 'Second message',
        type: 'error',
        duration: 3000
      });
    });
    
    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0].message).toBe('First message');
    expect(result.current.toasts[1].message).toBe('Second message');
  });

  it('should remove a toast by id', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast({
        message: 'Test message',
        type: 'success',
        duration: 5000
      });
    });
    
    const toastId = result.current.toasts[0].id;
    
    act(() => {
      result.current.removeToast(toastId);
    });
    
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should clear all toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast({
        message: 'First message',
        type: 'success',
        duration: 5000
      });
      result.current.addToast({
        message: 'Second message',
        type: 'error',
        duration: 3000
      });
    });
    
    expect(result.current.toasts).toHaveLength(2);
    
    act(() => {
      result.current.clearAll();
    });
    
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should limit the number of toasts to maximum', () => {
    const { result } = renderHook(() => useToast());
    
    // Add 6 toasts (assuming max is 5)
    act(() => {
      for (let i = 0; i < 6; i++) {
        result.current.addToast({
          message: `Message ${i}`,
          type: 'info',
          duration: 5000
        });
      }
    });
    
    // Should only keep the latest 5 toasts
    expect(result.current.toasts).toHaveLength(5);
    expect(result.current.toasts[0].message).toBe('Message 1'); // oldest kept
    expect(result.current.toasts[4].message).toBe('Message 5'); // newest
  });

  it('should provide convenience methods for different types', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.success('Success message');
    });
    
    act(() => {
      result.current.error('Error message');
    });
    
    act(() => {
      result.current.info('Info message');
    });
    
    act(() => {
      result.current.warning('Warning message');
    });
    
    expect(result.current.toasts).toHaveLength(4);
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[1].type).toBe('error');
    expect(result.current.toasts[2].type).toBe('info');
    expect(result.current.toasts[3].type).toBe('warning');
  });
});