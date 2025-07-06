// 🔴 Red Phase: Theme Context Tests
import { render, renderHook, act, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeContext';
import React from 'react';

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
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

describe('🔴 Red Phase: ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    
    // Clear any existing classes
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  describe('ThemeProvider初期化', () => {
    it('保存されたテーマがない場合はシステム設定を使用すべき', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockMatchMedia.mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const TestComponent = () => {
        const { theme } = useTheme();
        return <div data-testid="theme">{theme}</div>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    it('保存されたテーマがある場合はそれを使用すべき', () => {
      mockLocalStorage.getItem.mockReturnValue('light');

      const TestComponent = () => {
        const { theme } = useTheme();
        return <div data-testid="theme">{theme}</div>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    it('マウント前は不透明度0でコンテンツを隠すべき', () => {
      const TestComponent = () => {
        return <div data-testid="content">Test Content</div>;
      };

      const { container } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Initially should have opacity-0 class
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('opacity-0');
    });
  });

  describe('テーマ切り替え機能', () => {
    it('toggleTheme関数でテーマが切り替わるべき', async () => {
      mockLocalStorage.getItem.mockReturnValue('light');

      const TestComponent = () => {
        const { theme, toggleTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme">{theme}</div>
            <button onClick={toggleTheme} data-testid="toggle">
              Toggle
            </button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('light');

      // Click toggle button
      const toggleButton = screen.getByTestId('toggle');
      act(() => {
        toggleButton.click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('setTheme関数で直接テーマを設定できるべき', async () => {
      const TestComponent = () => {
        const { theme, setTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme">{theme}</div>
            <button onClick={() => setTheme('dark')} data-testid="set-dark">
              Set Dark
            </button>
            <button onClick={() => setTheme('light')} data-testid="set-light">
              Set Light
            </button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Set to dark
      const setDarkButton = screen.getByTestId('set-dark');
      act(() => {
        setDarkButton.click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');

      // Set to light
      const setLightButton = screen.getByTestId('set-light');
      act(() => {
        setLightButton.click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });

  describe('DOM操作', () => {
    it('ダークモード時にhtmlタグにdarkクラスが追加されるべき', () => {
      const TestComponent = () => {
        const { setTheme } = useTheme();
        return (
          <button onClick={() => setTheme('dark')} data-testid="set-dark">
            Set Dark
          </button>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const setDarkButton = screen.getByTestId('set-dark');
      act(() => {
        setDarkButton.click();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('ライトモード時にhtmlタグからdarkクラスが削除されるべき', () => {
      // Start with dark class
      document.documentElement.classList.add('dark');

      const TestComponent = () => {
        const { setTheme } = useTheme();
        return (
          <button onClick={() => setTheme('light')} data-testid="set-light">
            Set Light
          </button>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const setLightButton = screen.getByTestId('set-light');
      act(() => {
        setLightButton.click();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('localStorage連携', () => {
    it('テーマ変更時にlocalStorageに保存されるべき', () => {
      const TestComponent = () => {
        const { toggleTheme } = useTheme();
        return (
          <button onClick={toggleTheme} data-testid="toggle">
            Toggle
          </button>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const toggleButton = screen.getByTestId('toggle');
      act(() => {
        toggleButton.click();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', expect.any(String));
    });

    it('初期化時にlocalStorageからテーマを読み込むべき', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      const TestComponent = () => {
        const { theme } = useTheme();
        return <div data-testid="theme">{theme}</div>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme');
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });
  });

  describe('useThemeフック', () => {
    it('ThemeProvider外で使用した場合にエラーをthrowすべき', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      console.error = originalError;
    });

    it('ThemeProvider内で使用した場合は正常にコンテキストを返すべき', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('toggleTheme');
      expect(result.current).toHaveProperty('setTheme');
      expect(typeof result.current.toggleTheme).toBe('function');
      expect(typeof result.current.setTheme).toBe('function');
    });
  });

  describe('システムテーマ連携', () => {
    it('システムがライトモードでlocalStorageが空の場合はライトテーマになるべき', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockMatchMedia.mockImplementation(query => ({
        matches: false, // Light mode
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const TestComponent = () => {
        const { theme } = useTheme();
        return <div data-testid="theme">{theme}</div>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    it('システムがダークモードでlocalStorageが空の場合はダークテーマになるべき', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockMatchMedia.mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const TestComponent = () => {
        const { theme } = useTheme();
        return <div data-testid="theme">{theme}</div>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });
  });

  describe('フラッシュ防止機能', () => {
    it('マウント完了まではopacity-0クラスでコンテンツを隠すべき', () => {
      const TestComponent = () => <div data-testid="content">Content</div>;

      const { container } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Check for opacity-0 class on wrapper
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('opacity-0');
    });
  });
});