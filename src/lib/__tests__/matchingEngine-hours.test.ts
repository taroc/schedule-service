/**
 * 🔴 Red Phase: 時間単位マッチングエンジンのテスト
 * 
 * 時間概念変更：
 * - evening: 3時間
 * - fullday: 10時間
 * - requiredTimeSlots → requiredHours
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Event } from '@/types/event';

interface HourBasedUserSchedule {
  userId: string;
  date: Date;
  timeSlots: {
    evening: boolean;  // 3時間
    fullday: boolean;  // 10時間
  };
}

// モック設定
vi.mock('@/lib/eventStorage', () => ({
  eventStorage: {
    getEventById: vi.fn(),
    updateEventStatus: vi.fn(),
  },
}));

vi.mock('@/lib/scheduleStorage', () => ({
  scheduleStorage: {
    getSchedulesByUserIds: vi.fn(),
  },
}));

// マッチングエンジンをインポート
import { matchingEngine } from '@/lib/matchingEngine';

describe('🔴 Red Phase: 時間単位マッチングエンジン', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('時間ベースのマッチング機能', () => {
    it('必要時間が3時間で、evening時間帯が利用可能な場合、マッチング成功すべき', async () => {
      // Arrange: 3時間必要なイベント
      const eventId = 'event-1';
      const mockEvent: Event = {
        id: eventId,
        name: 'テストイベント',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredHours: 3, // 3時間必要
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-25'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: HourBasedUserSchedule[] = [
        { userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false } },
        { userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false } },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: マッチング成功を期待
      expect(result.isMatched).toBe(true);
      expect(result.reason).toContain('マッチング成功');
      expect(result.matchedTimeSlots).toBeDefined();
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots![0].date).toEqual(new Date('2024-01-21'));
      expect(result.matchedTimeSlots![0].timeSlot).toBe('evening');
    });

    it('必要時間が10時間で、fullday時間帯が利用可能な場合、マッチング成功すべき', async () => {
      // Arrange: 10時間必要なイベント
      const eventId = 'event-2';
      const mockEvent: Event = {
        id: eventId,
        name: 'テストイベント2',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredHours: 10, // 10時間必要
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-25'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: HourBasedUserSchedule[] = [
        { userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true } },
        { userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true } },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: マッチング成功を期待
      expect(result.isMatched).toBe(true);
      expect(result.reason).toContain('マッチング成功');
      expect(result.matchedTimeSlots).toBeDefined();
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots![0].date).toEqual(new Date('2024-01-21'));
      expect(result.matchedTimeSlots![0].timeSlot).toBe('fullday');
    });

    it('必要時間が6時間で、evening(3h)×2日が利用可能な場合、マッチング成功すべき', async () => {
      // Arrange: 6時間必要なイベント（evening×2日）
      const eventId = 'event-3';
      const mockEvent: Event = {
        id: eventId,
        name: 'テストイベント3',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredHours: 6, // 6時間必要（evening×2日）
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-25'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: HourBasedUserSchedule[] = [
        { userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false } },
        { userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false } },
        { userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false } },
        { userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false } },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: マッチング成功を期待
      expect(result.isMatched).toBe(true);
      expect(result.reason).toContain('マッチング成功');
      expect(result.matchedTimeSlots).toBeDefined();
      expect(result.matchedTimeSlots).toHaveLength(2);
      expect(result.matchedTimeSlots![0].timeSlot).toBe('evening');
      expect(result.matchedTimeSlots![1].timeSlot).toBe('evening');
    });

    it('必要時間が13時間で、fullday(10h)+evening(3h)が利用可能な場合、マッチング成功すべき', async () => {
      // Arrange: 13時間必要なイベント（fullday+evening）
      const eventId = 'event-4';
      const mockEvent: Event = {
        id: eventId,
        name: 'テストイベント4',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredHours: 13, // 13時間必要（fullday+evening）
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-25'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: HourBasedUserSchedule[] = [
        { userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true } },
        { userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false } },
        { userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true } },
        { userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false } },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: マッチング成功を期待
      expect(result.isMatched).toBe(true);
      expect(result.reason).toContain('マッチング成功');
      expect(result.matchedTimeSlots).toBeDefined();
      expect(result.matchedTimeSlots).toHaveLength(2);
      
      // 時間数の合計が13時間以上であることを確認
      const totalHours = result.matchedTimeSlots!.reduce((sum, slot) => {
        return sum + (slot.timeSlot === 'evening' ? 3 : 10);
      }, 0);
      expect(totalHours).toBeGreaterThanOrEqual(13);
    });

    it('必要時間数に対して利用可能時間が不足している場合、マッチング失敗すべき', async () => {
      // Arrange: 10時間必要だがevening(3時間)しか利用不可
      const eventId = 'event-5';
      const mockEvent: Event = {
        id: eventId,
        name: 'テストイベント5',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredHours: 10, // 10時間必要
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'), // 1日のみ
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: HourBasedUserSchedule[] = [
        { userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false } },
        { userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false } },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: マッチング失敗を期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('時間数が不足');
      expect(result.matchedTimeSlots).toBeUndefined();
    });
  });
});