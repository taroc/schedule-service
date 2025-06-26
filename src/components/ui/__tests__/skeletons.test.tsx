/**
 * Skeleton UI Components Test Suite
 * t-wada流TDD: 最初に失敗するテストを書く
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  EventCardSkeleton, 
  CalendarSkeleton, 
  StatsCardSkeleton,
  SkeletonText,
  SkeletonBox 
} from '@/components/ui/skeletons';

describe('🔴 Red Phase: Skeleton UI Components', () => {
  describe('EventCardSkeleton', () => {
    it('イベントカード形式のスケルトンを表示すべき', () => {
      render(<EventCardSkeleton />);
      
      // イベントカードの主要要素がスケルトンとして存在することを確認
      const container = screen.getByTestId('event-card-skeleton');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('animate-pulse');
      
      // タイトル部分のスケルトン
      const titleSkeleton = screen.getByTestId('event-title-skeleton');
      expect(titleSkeleton).toBeInTheDocument();
      
      // ステータス部分のスケルトン
      const statusSkeleton = screen.getByTestId('event-status-skeleton');
      expect(statusSkeleton).toBeInTheDocument();
      
      // 説明部分のスケルトン
      const descriptionSkeleton = screen.getByTestId('event-description-skeleton');
      expect(descriptionSkeleton).toBeInTheDocument();
    });

    it('複数のイベント用スケルトンを指定数表示すべき', () => {
      render(<EventCardSkeleton count={3} />);
      
      const skeletons = screen.getAllByTestId('event-card-skeleton');
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('CalendarSkeleton', () => {
    it('カレンダー形式のスケルトンを表示すべき', () => {
      render(<CalendarSkeleton />);
      
      const container = screen.getByTestId('calendar-skeleton');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('animate-pulse');
      
      // 7x6のカレンダーグリッド（42個の日付セル）
      const dayCells = screen.getAllByTestId('calendar-day-skeleton');
      expect(dayCells).toHaveLength(42);
    });

    it('カスタムグリッドサイズでスケルトンを表示すべき', () => {
      render(<CalendarSkeleton rows={4} cols={7} />);
      
      const dayCells = screen.getAllByTestId('calendar-day-skeleton');
      expect(dayCells).toHaveLength(28); // 4x7 = 28
    });
  });

  describe('StatsCardSkeleton', () => {
    it('統計カード形式のスケルトンを表示すべき', () => {
      render(<StatsCardSkeleton />);
      
      const container = screen.getByTestId('stats-card-skeleton');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('animate-pulse');
      
      // アイコン部分のスケルトン
      const iconSkeleton = screen.getByTestId('stats-icon-skeleton');
      expect(iconSkeleton).toBeInTheDocument();
      
      // ラベル部分のスケルトン
      const labelSkeleton = screen.getByTestId('stats-label-skeleton');
      expect(labelSkeleton).toBeInTheDocument();
      
      // 数値部分のスケルトン
      const valueSkeleton = screen.getByTestId('stats-value-skeleton');
      expect(valueSkeleton).toBeInTheDocument();
    });

    it('複数の統計カード用スケルトンを指定数表示すべき', () => {
      render(<StatsCardSkeleton count={4} />);
      
      const skeletons = screen.getAllByTestId('stats-card-skeleton');
      expect(skeletons).toHaveLength(4);
    });
  });

  describe('SkeletonText', () => {
    it('テキスト行のスケルトンを表示すべき', () => {
      render(<SkeletonText />);
      
      const skeleton = screen.getByTestId('skeleton-text');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-300', 'rounded');
    });

    it('カスタム幅でテキストスケルトンを表示すべき', () => {
      render(<SkeletonText width="w-32" />);
      
      const skeleton = screen.getByTestId('skeleton-text');
      expect(skeleton).toHaveClass('w-32');
    });

    it('複数行のテキストスケルトンを表示すべき', () => {
      render(<SkeletonText lines={3} />);
      
      const skeletons = screen.getAllByTestId('skeleton-text');
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('SkeletonBox', () => {
    it('汎用ボックススケルトンを表示すべき', () => {
      render(<SkeletonBox />);
      
      const skeleton = screen.getByTestId('skeleton-box');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-300', 'rounded');
    });

    it('カスタムサイズでボックススケルトンを表示すべき', () => {
      render(<SkeletonBox className="w-16 h-16" />);
      
      const skeleton = screen.getByTestId('skeleton-box');
      expect(skeleton).toHaveClass('w-16', 'h-16');
    });
  });

  describe('アクセシビリティ', () => {
    it('すべてのスケルトンコンポーネントが適切なaria-labelを持つべき', () => {
      render(
        <div>
          <EventCardSkeleton />
          <CalendarSkeleton />
          <StatsCardSkeleton />
          <SkeletonText />
          <SkeletonBox />
        </div>
      );

      // スクリーンリーダー用のラベルが存在することを確認
      expect(screen.getByLabelText('イベント情報を読み込み中')).toBeInTheDocument();
      expect(screen.getByLabelText('カレンダーを読み込み中')).toBeInTheDocument();
      expect(screen.getByLabelText('統計情報を読み込み中')).toBeInTheDocument();
      expect(screen.getByLabelText('テキストを読み込み中')).toBeInTheDocument();
      expect(screen.getByLabelText('コンテンツを読み込み中')).toBeInTheDocument();
    });
  });

  describe('レスポンシブ対応', () => {
    it('EventCardSkeletonがモバイル対応のクラスを持つべき', () => {
      render(<EventCardSkeleton />);
      
      const container = screen.getByTestId('event-card-skeleton');
      // モバイルでは縦に積み重なり、デスクトップでは横並びになるパディングとマージン
      expect(container).toHaveClass('p-4', 'sm:p-6');
    });
  });
});