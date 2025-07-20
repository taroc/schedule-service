/**
 * 🔴 Red Phase: マッチングエンジンのテスト
 * 
 * t-wadaさんのTDD方法論に従い、まず失敗するテストを作成
 * 要件定義に基づく基本的なマッチング機能をテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// 型定義は実装から使用

// 実際の型をインポート
import type { Event } from '@/types/event';

interface UserSchedule {
  userId: string;
  date: Date;
  daytime: boolean;
  evening: boolean;
}

// マッチングエンジンのインターフェースは実装から使用

// モック設定（実際の実装をモック化）

// モックを設定
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

describe('🔴 Red Phase: MatchingEngine', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的なマッチング機能', () => {
    it('必要な参加者数と時間スロットが揃った場合、マッチング成功すべき', async () => {
      // Arrange: テストデータ準備
      const eventId = 'event-1';
      const mockEvent: Event = {
        id: eventId,
        name: 'テストイベント',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
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

      const mockSchedules: UserSchedule[] = [
        { userId: 'user1', date: new Date('2024-01-21'), daytime: true, evening: true },
        { userId: 'user2', date: new Date('2024-01-21'), daytime: true, evening: true },
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
      expect(['daytime', 'evening']).toContain(result.matchedTimeSlots![0].timeSlot);
    });

    it('参加者数が不足している場合、マッチング失敗すべき', async () => {
      // Arrange: 参加者不足のイベント
      const eventId = 'event-2';
      const mockEvent: Event = {
        id: eventId,
        name: 'テストイベント2',
        description: 'テスト用のイベントです',
        requiredParticipants: 3,
        requiredTimeSlots: 1,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'], // 2人しかいない
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-25'),
        status: 'open',
        reservationStatus: 'open',
      };

      const { eventStorage } = await import('@/lib/eventStorage');
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: マッチング失敗を期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数が不足');
      expect(result.matchedTimeSlots).toBeUndefined();
    });

    it('連続した時間スロットが不足している場合、マッチング失敗すべき', async () => {
      // Arrange: 時間スロット不足のイベント
      const eventId = 'event-3';
      const mockEvent: Event = {
        id: eventId,
        name: 'テストイベント3',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredTimeSlots: 3, // 3コマ必要
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-22'), // 2日間のみ = 最大4コマ
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: UserSchedule[] = [
        // user1は1日目の午前のみ可用
        { userId: 'user1', date: new Date('2024-01-21'), daytime: true, evening: false },
        { userId: 'user1', date: new Date('2024-01-22'), daytime: false, evening: false },
        // user2は2日目の午後のみ可用
        { userId: 'user2', date: new Date('2024-01-21'), daytime: false, evening: false },
        { userId: 'user2', date: new Date('2024-01-22'), daytime: false, evening: true },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: マッチング失敗を期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('時間スロット不足');
      expect(result.matchedTimeSlots).toBeUndefined();
    });

    it('イベントが存在しない場合、適切なエラーメッセージを返すべき', async () => {
      // Arrange: 存在しないイベント
      const eventId = 'non-existent-event';
      
      const { eventStorage } = await import('@/lib/eventStorage');
      vi.mocked(eventStorage.getEventById).mockResolvedValue(null);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: エラーを期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('イベントが見つかりません');
    });
  });

  describe('時間スロット検索機能', () => {
    it('利用可能な時間スロットを正しく特定できるべき', () => {
      // Arrange: テストデータ
      const event: Event = {
        id: 'event-1',
        name: 'テストイベント4',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-23'),
        status: 'open',
        reservationStatus: 'open',
      };

      const schedules: UserSchedule[] = [
        // 2024-01-21: 両方とも午前・午後可用
        { userId: 'user1', date: new Date('2024-01-21'), daytime: true, evening: true },
        { userId: 'user2', date: new Date('2024-01-21'), daytime: true, evening: true },
        // 2024-01-22: user1のみ午前可用
        { userId: 'user1', date: new Date('2024-01-22'), daytime: true, evening: false },
        { userId: 'user2', date: new Date('2024-01-22'), daytime: false, evening: false },
        // 2024-01-23: 両方とも午後可用
        { userId: 'user1', date: new Date('2024-01-23'), daytime: false, evening: true },
        { userId: 'user2', date: new Date('2024-01-23'), daytime: false, evening: true },
      ];

      // Act: 利用可能な時間スロットを検索
      const availableSlots = matchingEngine.findAvailableTimeSlots(event, schedules);

      // Assert: 期待される時間スロット
      expect(availableSlots).toHaveLength(3); // 21日午前・21日午後・23日午後
      
      const expectedSlots = [
        { date: new Date('2024-01-21'), timeSlot: 'daytime' },
        { date: new Date('2024-01-21'), timeSlot: 'evening' },
        { date: new Date('2024-01-23'), timeSlot: 'evening' },
      ];

      expectedSlots.forEach(expectedSlot => {
        expect(availableSlots).toContainEqual(expectedSlot);
      });
    });

    it('連続した時間スロットが必要な場合、適切に検出できるべき', () => {
      // Arrange: 連続3コマが必要なイベント
      const event: Event = {
        id: 'event-1',
        name: 'テストイベント5',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredTimeSlots: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-23'),
        status: 'open',
        reservationStatus: 'open',
      };

      const schedules: UserSchedule[] = [
        // 連続3コマ可用: 21日午前 → 21日午後 → 22日午前
        { userId: 'user1', date: new Date('2024-01-21'), daytime: true, evening: true },
        { userId: 'user2', date: new Date('2024-01-21'), daytime: true, evening: true },
        { userId: 'user1', date: new Date('2024-01-22'), daytime: true, evening: false },
        { userId: 'user2', date: new Date('2024-01-22'), daytime: true, evening: false },
        { userId: 'user1', date: new Date('2024-01-23'), daytime: false, evening: false },
        { userId: 'user2', date: new Date('2024-01-23'), daytime: false, evening: false },
      ];

      // Act: 利用可能な時間スロットを検索
      const availableSlots = matchingEngine.findAvailableTimeSlots(event, schedules);

      // Assert: 連続3コマが検出されることを期待
      expect(availableSlots).toHaveLength(3);
      expect(availableSlots).toContainEqual({ date: new Date('2024-01-21'), timeSlot: 'daytime' });
      expect(availableSlots).toContainEqual({ date: new Date('2024-01-21'), timeSlot: 'evening' });
      expect(availableSlots).toContainEqual({ date: new Date('2024-01-22'), timeSlot: 'daytime' });
    });
  });

  describe('参加者検証機能', () => {
    it('すべての参加者が有効な場合、trueを返すべき', async () => {
      // Arrange: 有効な参加者を持つイベント
      const event: Event = {
        id: 'event-1',
        name: 'テストイベント6',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
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

      // Act: 参加者検証
      const isValid = await matchingEngine.validateParticipants(event);

      // Assert: 有効であることを期待
      expect(isValid).toBe(true);
    });

    it('参加者数が不足している場合、falseを返すべき', async () => {
      // Arrange: 参加者不足のイベント
      const event: Event = {
        id: 'event-2',
        name: 'テストイベント7',
        description: 'テスト用のイベントです',
        requiredParticipants: 3,
        requiredTimeSlots: 1,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'], // 2人しかいない
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-25'),
        status: 'open',
        reservationStatus: 'open',
      };

      // Act: 参加者検証
      const isValid = await matchingEngine.validateParticipants(event);

      // Assert: 無効であることを期待
      expect(isValid).toBe(false);
    });
  });
});