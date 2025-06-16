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
    <div className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold text-center mb-6">ログイン</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="userId" className="block text-gray-700 text-sm font-bold mb-2">
            ユーザーID
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </button>

        <p className="text-center mt-4 text-sm text-gray-600">
          アカウントをお持ちでない方は{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-500 hover:text-blue-700 underline"
          >
            こちら
          </button>
        </p>
      </form>
    </div>
  );
}