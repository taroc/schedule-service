/**
 * Error Boundary Component Test Suite
 * t-wada流TDD: 最初に失敗するテストを書く
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import React from 'react';

// コンソールエラーをモック（テスト中のログノイズを避ける）
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

// エラーを投げるテスト用コンポーネント
const ThrowError = ({ shouldThrow = false, errorType = 'generic' }: { shouldThrow?: boolean; errorType?: string }) => {
  if (shouldThrow) {
    if (errorType === 'api') {
      throw new Error('API_ERROR: データの取得に失敗しました');
    } else if (errorType === 'network') {
      throw new Error('NETWORK_ERROR: ネットワークに接続できません');
    } else if (errorType === 'auth') {
      throw new Error('AUTH_ERROR: 認証に失敗しました');
    } else {
      throw new Error('予期しないエラーが発生しました');
    }
  }
  return <div data-testid="child-component">正常なコンポーネント</div>;
};

describe('🔴 Red Phase: Error Boundary Component', () => {
  describe('基本的なエラーハンドリング', () => {
    it('子コンポーネントが正常な場合は通常の表示をすべき', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument();
    });

    it('子コンポーネントでエラーが発生した場合はエラーUIを表示すべき', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // エラーUIのコンポーネントが表示されることを確認
      expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      expect(screen.getByText('申し訳ありません')).toBeInTheDocument();
      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();
    });

    it('エラー発生時にリロードボタンが表示されるべき', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: 'ページをリロード' });
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton).toHaveClass('cursor-pointer');
    });
  });

  describe('エラータイプ別の表示', () => {
    it('APIエラー時に適切なメッセージを表示すべき', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="api" />
        </ErrorBoundary>
      );

      expect(screen.getByText('データの読み込みに失敗しました')).toBeInTheDocument();
      expect(screen.getByText('しばらく時間をおいてから再度お試しください')).toBeInTheDocument();
    });

    it('ネットワークエラー時に適切なメッセージを表示すべき', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </ErrorBoundary>
      );

      expect(screen.getByText('ネットワーク接続に問題があります')).toBeInTheDocument();
      expect(screen.getByText('インターネット接続を確認してください')).toBeInTheDocument();
    });

    it('認証エラー時に適切なメッセージを表示すべき', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="auth" />
        </ErrorBoundary>
      );

      expect(screen.getByText('認証に問題があります')).toBeInTheDocument();
      expect(screen.getByText('再度ログインしてください')).toBeInTheDocument();
    });

    it('一般的なエラー時にデフォルトメッセージを表示すべき', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="generic" />
        </ErrorBoundary>
      );

      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('ページをリロードしてもう一度お試しください')).toBeInTheDocument();
    });
  });

  describe('カスタムfallbackコンポーネント', () => {
    it('カスタムfallbackUIが提供された場合はそれを使用すべき', () => {
      const CustomFallback = () => (
        <div data-testid="custom-error-fallback">
          カスタムエラー表示
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-error-fallback')).toBeInTheDocument();
      expect(screen.getByText('カスタムエラー表示')).toBeInTheDocument();
      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });
  });

  describe('エラー報告機能', () => {
    it('onError コールバックが呼ばれるべき', () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('開発モードでエラー詳細が表示されるべき', () => {
      // 開発モードを模擬
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラー詳細')).toBeInTheDocument();
      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();

      // 環境変数を元に戻す
      process.env.NODE_ENV = originalEnv;
    });

    it('本番モードではエラー詳細が表示されないべき', () => {
      // 本番モードを模擬
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('エラー詳細')).not.toBeInTheDocument();
      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();

      // 環境変数を元に戻す
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('アクセシビリティ', () => {
    it('エラー状態が適切にaria属性で伝達されるべき', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorContainer = screen.getByTestId('error-boundary-fallback');
      expect(errorContainer).toHaveAttribute('role', 'alert');
      expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
    });

    it('リロードボタンが適切なフォーカス管理をすべき', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: 'ページをリロード' });
      expect(reloadButton).toHaveAttribute('aria-describedby');
    });
  });

  describe('エラーリセット機能', () => {
    it('resetKeys が変更された時にエラー状態がリセットされるべき', async () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['initial']}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // エラー状態であることを確認
      expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

      // resetKey を変更してリレンダー（子コンポーネントもエラーを投げないように変更）
      rerender(
        <ErrorBoundary resetKeys={['changed']}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // 非同期のsetTimeoutを待つ
      await new Promise(resolve => setTimeout(resolve, 10));

      // エラー状態がリセットされて正常なコンポーネントが表示されることを確認
      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
      expect(screen.getByTestId('child-component')).toBeInTheDocument();
    });
  });
});