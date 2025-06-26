/**
 * EventList Skeleton UI Integration Test
 * t-wada流TDD: EventListのローディング状態にスケルトンUIを統合
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventList from '@/components/events/EventList';

// スケルトンコンポーネントをモック（実装前なのでモック）  
vi.mock('@/components/ui/skeletons', () => ({
  EventCardSkeleton: ({ count = 1 }: { count?: number }) => (
    <div data-testid="event-card-skeleton-wrapper" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} data-testid="event-card-skeleton" />
      ))}
    </div>
  )
}));

describe('🔴 Red Phase: EventList Skeleton UI Integration', () => {
  describe('ローディング状態でのスケルトン表示', () => {
    it('ローディング状態時にEventCardSkeletonを表示すべき', () => {
      render(
        <EventList 
          events={[]} 
          isLoading={true}
        />
      );

      // 従来のスピナーではなくスケルトンが表示されることを確認
      expect(screen.getByTestId('event-card-skeleton-wrapper')).toBeInTheDocument();
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).toBeNull(); // スピナーのaria-roleがないことを確認
    });

    it('ローディング状態時に適切な数のスケルトンを表示すべき', () => {
      render(
        <EventList 
          events={[]} 
          isLoading={true}
        />
      );

      // デフォルトで3つのスケルトンカードが表示される
      const skeletons = screen.getAllByTestId('event-card-skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('ローディング完了後はスケルトンが表示されないことを確認', () => {
      const mockEvent = {
        id: 'event-1',
        name: 'テストイベント',
        description: 'テスト用のイベントです',
        creatorId: 'user-1',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        status: 'open' as const,
        participants: [],
        creator: { id: 'user-1', hashedPassword: 'hash' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        matchedTimeSlots: null
      };

      render(
        <EventList 
          events={[mockEvent]} 
          isLoading={false}
        />
      );

      // スケルトンが表示されていないことを確認
      expect(screen.queryByTestId('event-card-skeleton-wrapper')).not.toBeInTheDocument();
      // 実際のイベントが表示されていることを確認
      expect(screen.getByText('テストイベント')).toBeInTheDocument();
    });
  });

  describe('異なるdisplayModeでのスケルトン表示', () => {
    it('availableモードでもスケルトンが正しく表示されるべき', () => {
      render(
        <EventList 
          events={[]} 
          isLoading={true}
          displayMode="available"
        />
      );

      expect(screen.getByTestId('event-card-skeleton-wrapper')).toBeInTheDocument();
      const skeletons = screen.getAllByTestId('event-card-skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('createdモードでもスケルトンが正しく表示されるべき', () => {
      render(
        <EventList 
          events={[]} 
          isLoading={true}
          displayMode="created"
        />
      );

      expect(screen.getByTestId('event-card-skeleton-wrapper')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('ローディング状態がaria-busyで適切に伝達されるべき', () => {
      render(
        <EventList 
          events={[]} 
          isLoading={true}
        />
      );

      // コンテナにaria-busy属性が設定されていることを確認
      const container = screen.getByTestId('event-card-skeleton-wrapper').closest('div');
      expect(container).toHaveAttribute('aria-busy', 'true');
    });

    it('ローディング完了後はaria-busyが解除されるべき', () => {
      const mockEvent = {
        id: 'event-1',
        name: 'テストイベント',
        description: 'テスト用のイベントです',
        creatorId: 'user-1',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        status: 'open' as const,
        participants: [],
        creator: { id: 'user-1', hashedPassword: 'hash' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        matchedTimeSlots: null
      };

      const { container } = render(
        <EventList 
          events={[mockEvent]} 
          isLoading={false}
        />
      );

      // aria-busyが存在しないか、falseに設定されていることを確認
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).not.toHaveAttribute('aria-busy', 'true');
    });
  });
});