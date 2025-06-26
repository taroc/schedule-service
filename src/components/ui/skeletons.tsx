/**
 * Skeleton UI Components
 * Reusable loading skeleton components for consistent UX
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  'data-testid'?: string;
}

interface CountableSkeletonProps extends SkeletonProps {
  count?: number;
}

// 汎用ボックススケルトン
export const SkeletonBox: React.FC<SkeletonProps> = ({ 
  className = 'w-full h-4', 
  'data-testid': testId = 'skeleton-box' 
}) => (
  <div 
    className={`bg-gray-300 rounded animate-pulse ${className}`}
    data-testid={testId}
    aria-label="コンテンツを読み込み中"
  />
);

// テキスト行のスケルトン
interface SkeletonTextProps extends SkeletonProps {
  width?: string;
  lines?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ 
  width = 'w-full', 
  lines = 1,
  className = '',
  'data-testid': testId = 'skeleton-text'
}) => {
  const textLines = Array.from({ length: lines }, (_, index) => (
    <div
      key={index}
      className={`h-4 bg-gray-300 rounded animate-pulse ${width} ${className} ${index > 0 ? 'mt-2' : ''}`}
      data-testid={testId}
      aria-label="テキストを読み込み中"
    />
  ));

  return lines === 1 ? textLines[0] : <div>{textLines}</div>;
};

// イベントカードのスケルトン
export const EventCardSkeleton: React.FC<CountableSkeletonProps> = ({ 
  count = 1,
  className = '',
  'data-testid': testId = 'event-card-skeleton'
}) => {
  const skeletonCard = (index: number) => (
    <div
      key={index}
      className={`bg-white shadow-md rounded-lg p-4 sm:p-6 border-2 animate-pulse ${className}`}
      data-testid={testId}
      aria-label="イベント情報を読み込み中"
    >
      {/* タイトルとステータス */}
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="h-6 bg-gray-300 rounded w-48"
          data-testid="event-title-skeleton"
        />
        <div 
          className="h-8 bg-gray-300 rounded-full w-20"
          data-testid="event-status-skeleton"
        />
      </div>
      
      {/* 説明文 */}
      <div className="space-y-2 mb-4" data-testid="event-description-skeleton">
        <div className="h-4 bg-gray-300 rounded w-full" />
        <div className="h-4 bg-gray-300 rounded w-3/4" />
      </div>
      
      {/* メタ情報 */}
      <div className="flex gap-4 mb-3">
        <div className="h-4 bg-gray-300 rounded w-24" />
        <div className="h-4 bg-gray-300 rounded w-32" />
      </div>
      
      {/* ボタン */}
      <div className="h-10 bg-gray-300 rounded w-32" />
    </div>
  );

  const cards = Array.from({ length: count }, (_, index) => skeletonCard(index));
  
  if (count === 1) {
    return cards[0];
  }
  
  return (
    <div 
      className="space-y-4" 
      data-testid="event-card-skeleton-wrapper" 
      aria-busy="true"
      aria-label={`${count}個のイベントを読み込み中`}
    >
      {cards}
    </div>
  );
};

// カレンダーのスケルトン
interface CalendarSkeletonProps extends SkeletonProps {
  rows?: number;
  cols?: number;
}

export const CalendarSkeleton: React.FC<CalendarSkeletonProps> = ({ 
  rows = 6, 
  cols = 7,
  className = '',
  'data-testid': testId = 'calendar-skeleton'
}) => {
  const totalCells = rows * cols;
  
  return (
    <div 
      className={`bg-white rounded-lg shadow p-6 animate-pulse ${className}`}
      data-testid={testId}
      aria-label="カレンダーを読み込み中"
    >
      <div className="grid grid-cols-7 gap-2 mb-4">
        {Array.from({ length: totalCells }, (_, index) => (
          <div
            key={index}
            className="h-10 bg-gray-300 rounded"
            data-testid="calendar-day-skeleton"
          />
        ))}
      </div>
    </div>
  );
};

// 統計カードのスケルトン
export const StatsCardSkeleton: React.FC<CountableSkeletonProps> = ({ 
  count = 1,
  className = '',
  'data-testid': testId = 'stats-card-skeleton'
}) => {
  const skeletonCard = (index: number) => (
    <div
      key={index}
      className={`bg-white rounded-lg p-6 shadow-sm border animate-pulse ${className}`}
      data-testid={testId}
      aria-label="統計情報を読み込み中"
    >
      <div className="flex items-center">
        <div 
          className="p-2 rounded-full bg-gray-100"
          data-testid="stats-icon-skeleton"
        >
          <div className="w-6 h-6 bg-gray-300 rounded" />
        </div>
        <div className="ml-4">
          <div 
            className="w-24 h-4 bg-gray-300 rounded mb-2"
            data-testid="stats-label-skeleton"
          />
          <div 
            className="w-8 h-8 bg-gray-300 rounded"
            data-testid="stats-value-skeleton"
          />
        </div>
      </div>
    </div>
  );

  const cards = Array.from({ length: count }, (_, index) => skeletonCard(index));
  
  if (count === 1) {
    return cards[0];
  }
  
  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      aria-label={`${count}個の統計情報を読み込み中`}
    >
      {cards}
    </div>
  );
};