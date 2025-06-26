/**
 * Error Boundary Component
 * React エラー境界でアプリケーションの予期しないエラーをキャッチし、
 * ユーザーフレンドリーなエラーUIを表示する
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo: ErrorInfo }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // エラー報告コールバックを呼び出し
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 開発環境ではコンソールにエラー詳細をログ出力
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;
    
    // resetKeys が変更された場合、エラー状態をリセット
    if (hasError && resetKeys !== prevProps.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const currentKeys = resetKeys || [];
      
      // 配列の長さが違う、または要素が異なる場合にリセット
      const hasResetKeyChanged = 
        prevKeys.length !== currentKeys.length ||
        currentKeys.some((key, index) => key !== prevKeys[index]);
        
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }, 0);
  };

  handleReload = () => {
    window.location.reload();
  };

  getErrorMessage(error: Error): { title: string; description: string } {
    const message = error.message;

    if (message.includes('API_ERROR')) {
      return {
        title: 'データの読み込みに失敗しました',
        description: 'しばらく時間をおいてから再度お試しください',
      };
    }

    if (message.includes('NETWORK_ERROR')) {
      return {
        title: 'ネットワーク接続に問題があります',
        description: 'インターネット接続を確認してください',
      };
    }

    if (message.includes('AUTH_ERROR')) {
      return {
        title: '認証に問題があります',
        description: '再度ログインしてください',
      };
    }

    return {
      title: '予期しないエラーが発生しました',
      description: 'ページをリロードしてもう一度お試しください',
    };
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback: CustomFallback } = this.props;

    if (hasError && error) {
      // カスタムfallbackが提供されている場合はそれを使用
      if (CustomFallback && errorInfo) {
        return <CustomFallback error={error} errorInfo={errorInfo} />;
      }

      // デフォルトのエラーUI
      const { title, description } = this.getErrorMessage(error);
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div 
          className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
          data-testid="error-boundary-fallback"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            {/* エラーアイコン */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg 
                className="h-8 w-8 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>

            {/* エラーメッセージ */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              申し訳ありません
            </h2>
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 mb-6">
              {description}
            </p>

            {/* 開発モードでのエラー詳細 */}
            {isDevelopment && (
              <details className="text-left mb-6 bg-gray-100 rounded p-4">
                <summary className="font-semibold cursor-pointer text-gray-800 mb-2">
                  エラー詳細
                </summary>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                  {error.message}
                  {errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* リロードボタン */}
            <button
              onClick={this.handleReload}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 cursor-pointer"
              aria-describedby="reload-description"
            >
              ページをリロード
            </button>
            <p id="reload-description" className="sr-only">
              ページを再読み込みしてエラーを解決します
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}