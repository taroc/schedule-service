'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import ThemeToggle to avoid SSR issues
const ThemeToggle = dynamic(() => import('./ThemeToggle'), {
  ssr: false,
  loading: () => (
    <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 w-9 h-9">
      <div className="w-5 h-5 bg-gray-400 dark:bg-gray-500 rounded animate-pulse" />
    </div>
  )
});

export default function ClientThemeToggle() {
  return <ThemeToggle />;
}