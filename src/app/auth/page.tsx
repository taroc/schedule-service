'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const router = useRouter();

  const handleLogin = async (userId: string, password: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      await login(userId, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (userId: string, password: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      await register(userId, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      {/* Theme toggle in top right corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full">
        {isLogin ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToRegister={() => setIsLogin(false)}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <RegisterForm
            onRegister={handleRegister}
            onSwitchToLogin={() => setIsLogin(true)}
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>
    </div>
  );
}