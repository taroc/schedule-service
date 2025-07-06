// 🔴 Red Phase: Theme Toggle Component Tests
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('🔴 Red Phase: ThemeToggle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('基本レンダリング', () => {
    it('テーマトグルボタンが表示されるべき', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label');
    });

    it('ライトモード時は月アイコンが表示されるべき', () => {
      mockLocalStorage.getItem.mockReturnValue('light');
      
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'ダークモードに切り替え');
      expect(button).toHaveAttribute('title', 'ダークモードに切り替え');
      
      // Moon icon path should be present
      const moonIcon = button.querySelector('path[d*="20.354"]');
      expect(moonIcon).toBeInTheDocument();
    });

    it('ダークモード時は太陽アイコンが表示されるべき', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');
      
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'ライトモードに切り替え');
      expect(button).toHaveAttribute('title', 'ライトモードに切り替え');
      
      // Sun icon path should be present
      const sunIcon = button.querySelector('path[d*="M12 3v1m0 16v1"]');
      expect(sunIcon).toBeInTheDocument();
    });
  });

  describe('テーマ切り替え機能', () => {
    it('ボタンクリックでテーマが切り替わるべき', () => {
      mockLocalStorage.getItem.mockReturnValue('light');
      
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      
      // Initially light mode
      expect(button).toHaveAttribute('aria-label', 'ダークモードに切り替え');
      
      // Click to switch to dark mode
      fireEvent.click(button);
      
      // Should switch to dark mode (though the DOM update might be async)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('複数回クリックでテーマが交互に切り替わるべき', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      
      // First click - should switch to dark
      fireEvent.click(button);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
      
      // Second click - should switch back to light
      fireEvent.click(button);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });

  describe('スタイリング', () => {
    it('適切なCSSクラスが適用されているべき', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      
      // Check for expected classes
      expect(button).toHaveClass('p-2');
      expect(button).toHaveClass('rounded-lg');
      expect(button).toHaveClass('bg-gray-200');
      expect(button).toHaveClass('hover:bg-gray-300');
      expect(button).toHaveClass('dark:bg-gray-700');
      expect(button).toHaveClass('dark:hover:bg-gray-600');
      expect(button).toHaveClass('transition-colors');
      expect(button).toHaveClass('cursor-pointer');
    });

    it('SVGアイコンに適切なクラスが適用されているべき', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const svg = screen.getByRole('button').querySelector('svg');
      expect(svg).toHaveClass('w-5');
      expect(svg).toHaveClass('h-5');
      expect(svg).toHaveClass('text-gray-800');
      expect(svg).toHaveClass('dark:text-gray-200');
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なaria属性が設定されているべき', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('title');
    });

    it('キーボードナビゲーションが機能するべき', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      
      // Button should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);
      
      // Enter key should trigger click
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('スクリーンリーダー向けに適切なラベルが提供されるべき', () => {
      // Light mode
      mockLocalStorage.getItem.mockReturnValue('light');
      
      const { rerender } = render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'ダークモードに切り替え');

      // Dark mode
      mockLocalStorage.getItem.mockReturnValue('dark');
      
      rerender(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'ライトモードに切り替え');
    });
  });

  describe('エラーハンドリング', () => {
    it('ThemeProvider外で使用した場合にエラーをthrowすべき', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<ThemeToggle />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      console.error = originalError;
    });
  });

  describe('システムテーマとの連携', () => {
    it('システムがダークモードの場合は初期状態でダークモードになるべき', () => {
      // Mock system dark mode preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      mockLocalStorage.getItem.mockReturnValue(null); // No saved preference

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'ライトモードに切り替え');
    });
  });
});