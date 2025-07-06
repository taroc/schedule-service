'use client';

import { useState } from 'react';

interface LoginFormProps {
  onLogin: (userId: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function LoginForm({
  onLogin,
  onSwitchToRegister,
  isLoading = false,
  error
}: LoginFormProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(userId, password);
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">ログイン</h2>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="userId" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            ユーザーID
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </button>

        <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
          アカウントをお持ちでない方は{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline hover:cursor-pointer"
          >
            こちら
          </button>
        </p>
      </form>
    </div>
  );
}