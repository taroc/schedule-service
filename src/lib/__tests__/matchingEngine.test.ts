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

interface MockUserSchedule {
  id: string;
  userId: string;
  date: Date;
  timeSlots: {
    evening: boolean;
    fullday: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
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

      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
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
      expect(['evening', 'fullday']).toContain(result.matchedTimeSlots![0].timeSlot);
    });

    it('参加者数が不足している場合、マッチング失敗すべき', async () => {
      // Arrange: 参加者不足のイベント
      const eventId = 'event-2';
      const mockEvent: Event = {
        id: eventId,
        name: 'テストイベント2',
        description: 'テスト用のイベントです',
        requiredParticipants: 3,
        requiredHours: 3, // 3時間必要
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
        requiredHours: 10, // 10時間必要
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-22'), // 2日間のみ = 最大4時間スロット
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // user1は1日目の夜のみ可用
        { id: '3', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '4', userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        // user2は2日目の夜のみ可用
        { id: '5', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '6', userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: マッチング失敗を期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数が不足');
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
        requiredHours: 10, // 10時間必要
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

      const schedules: MockUserSchedule[] = [
        // 2024-01-21: 両方とも夜・終日可用
        { id: '7', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '8', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        // 2024-01-22: user1のみ夜可用（終日不可）
        { id: '9', userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '10', userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        // 2024-01-23: 両方とも夜可用
        { id: '11', userId: 'user1', date: new Date('2024-01-23'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '12', userId: 'user2', date: new Date('2024-01-23'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      // Act: 利用可能な時間スロットを検索
      const availableSlots = matchingEngine.findAvailableTimeSlots(event, schedules);

      // Assert: 期待される時間スロット組み合わせ（新しい実装では参加者情報も含む）
      expect(availableSlots).toHaveLength(3); // 21日夜・21日終日・23日夜
      
      const expectedSlots = [
        { slot: { date: new Date('2024-01-21'), timeSlot: 'evening' }, availableParticipants: ['user1', 'user2'] },
        { slot: { date: new Date('2024-01-21'), timeSlot: 'fullday' }, availableParticipants: ['user1', 'user2'] },
        { slot: { date: new Date('2024-01-23'), timeSlot: 'evening' }, availableParticipants: ['user1', 'user2'] },
      ];

      expectedSlots.forEach(expectedSlot => {
        expect(availableSlots).toContainEqual(expectedSlot);
      });
    });

    it('連続した時間スロットが必要な場合、適切に検出できるべき', () => {
      // Arrange: 連続3時間スロットが必要なイベント
      const event: Event = {
        id: 'event-1',
        name: 'テストイベント5',
        description: 'テスト用のイベントです',
        requiredParticipants: 2,
        requiredHours: 9,
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

      const schedules: MockUserSchedule[] = [
        // 単一の終日スロットで3時間を満たす: 21日終日（10時間）
        { id: '13', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '14', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '15', userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '16', userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '17', userId: 'user1', date: new Date('2024-01-23'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '18', userId: 'user2', date: new Date('2024-01-23'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      // Act: 利用可能な時間スロットを検索
      const availableSlots = matchingEngine.findAvailableTimeSlots(event, schedules);

      // Assert: 必要時間数（3時間）を満たす組み合わせが検出されることを期待
      expect(availableSlots).toHaveLength(2); // 21日夜・21日終日
      expect(availableSlots).toContainEqual({ 
        slot: { date: new Date('2024-01-21'), timeSlot: 'evening' }, 
        availableParticipants: ['user1', 'user2'] 
      });
      expect(availableSlots).toContainEqual({ 
        slot: { date: new Date('2024-01-21'), timeSlot: 'fullday' }, 
        availableParticipants: ['user1', 'user2'] 
      });
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
        requiredHours: 3, // 3時間必要
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

  describe('🔴 Red Phase: 最適参加者組み合わせマッチング', () => {
    it('全参加者が空いていなくても、必要人数分の最適な組み合わせでマッチングすべき', async () => {
      // Arrange: 5人登録、3人必要、うち3人だけが時間スロットで重複している場合
      const eventId = 'event-optimal-1';
      const mockEvent: Event = {
        id: eventId,
        name: '最適組み合わせテスト',
        description: '必要人数分の最適な参加者組み合わせを探すテスト',
        requiredParticipants: 3,
        requiredHours: 3, // 3時間必要
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3', 'user4', 'user5'], // 5人登録
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-23'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // user1: 21日夜のみ可用（3時間）
        { id: '19', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '20', userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        // user2: 21日夜のみ可用（3時間）
        { id: '21', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '22', userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        // user3: 21日夜のみ可用（3時間）
        { id: '23', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '24', userId: 'user3', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        // user4: 22日終日のみ可用（10時間）
        { id: '25', userId: 'user4', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '26', userId: 'user4', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        // user5: どの日も不可用
        { id: '27', userId: 'user5', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '28', userId: 'user5', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: user1, user2, user3の組み合わせで21日夜（3時間）がマッチしたことを期待
      expect(result.isMatched).toBe(true);
      expect(result.reason).toContain('マッチング成功');
      expect(result.matchedTimeSlots).toBeDefined();
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots![0].date).toEqual(new Date('2024-01-21'));
      expect(result.matchedTimeSlots![0].timeSlot).toBe('evening');
      expect(result.selectedParticipants).toEqual(['user1', 'user2', 'user3']);
    });

    it('複数の時間スロット候補から、先着順で必要人数ちょうど選ぶべき', async () => {
      // Arrange: 異なる時間スロットで同じ必要人数が可能、先着順で選択されることを確認
      const eventId = 'event-optimal-2';
      const mockEvent: Event = {
        id: eventId,
        name: '先着順選択テスト',
        description: '同じ必要人数でも参加登録順で選ばれることを確認するテスト',
        requiredParticipants: 2,
        requiredHours: 10, // 10時間必要（終日）
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3', 'user4'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-23'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // 21日終日: user2, user3が可用（必要人数2人、登録順では user1, user2 だが user1は不可用）
        { id: '29', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '30', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '31', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '32', userId: 'user4', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        // 22日終日: user1, user4が可用（必要人数2人、登録順では user1が先）  
        { id: '33', userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '34', userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '35', userId: 'user3', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '36', userId: 'user4', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 21日終日でuser2, user3が選ばれることを期待（必要人数2人ちょうど、先着順でuser2, user3が優先）
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots![0].date).toEqual(new Date('2024-01-21'));
      expect(result.matchedTimeSlots![0].timeSlot).toBe('fullday');
      expect(result.selectedParticipants).toHaveLength(2); // 必要人数ちょうど
      expect(result.selectedParticipants).toEqual(['user2', 'user3']); // 先着順（user1は不可用、user2とuser3が先着）
    });

    it('必要時間数を満たせる参加者が十分いない場合、マッチング失敗すべき', async () => {
      // Arrange: どの時間スロット組み合わせでも必要人数に達しない場合
      const eventId = 'event-optimal-3';
      const mockEvent: Event = {
        id: eventId,
        name: '参加者不足テスト',
        description: '必要人数を満たせない場合のテスト',
        requiredParticipants: 3,
        requiredHours: 3, // 3時間必要
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3', 'user4'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-22'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // 21日夜: user1のみ（1人）
        { id: '37', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '38', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '39', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '40', userId: 'user4', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        // 22日終日: user2, user3のみ（2人）- 3人必要だが不足
        { id: '41', userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '42', userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '43', userId: 'user3', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '44', userId: 'user4', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: マッチング失敗を期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数が不足');
    });
  });

  describe('🔴 Red Phase: 新優先順位マッチング', () => {
    it('終日スロットが優先されるべき（夜間より終日を選択）', async () => {
      // Arrange: 同じ日に夜間3時間と終日10時間の両方が利用可能な場合
      const eventId = 'event-fullday-priority';
      const mockEvent: Event = {
        id: eventId,
        name: '終日優先テスト',
        description: '終日スロットが夜間スロットより優先されることを確認',
        requiredParticipants: 2,
        requiredHours: 3, // 3時間必要（夜間でも終日でも満たせる）
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'), // 1日のみ
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // 21日: user1, user2, user3全員が夜間と終日両方可用
        { id: '100', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '101', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '102', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 終日スロットが選ばれることを期待
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots![0].timeSlot).toBe('fullday'); // 夜間ではなく終日
      expect(result.selectedParticipants).toHaveLength(2);
    });

    it('連続する日程が優先されるべき（バラバラの日より連続日程を選択）', async () => {
      // Arrange: 複数日にわたる日程で、連続日程と飛び石日程が選択可能な場合
      const eventId = 'event-consecutive-priority';
      const mockEvent: Event = {
        id: eventId,
        name: '連続日程優先テスト',
        description: '連続する日程がバラバラの日程より優先されることを確認',
        requiredParticipants: 2,
        requiredHours: 6, // 6時間必要（夜間2日分）
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-25'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // パターン1: 21日, 22日連続（user1, user2）
        { id: '200', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '201', userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '202', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '203', userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        // パターン2: 21日, 25日飛び石（user1, user3）
        { id: '204', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '205', userId: 'user3', date: new Date('2024-01-25'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 連続日程（21-22日）が選ばれることを期待
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      expect(result.matchedTimeSlots![0].date).toEqual(new Date('2024-01-21'));
      expect(result.matchedTimeSlots![1].date).toEqual(new Date('2024-01-22'));
      expect(result.selectedParticipants).toEqual(['user1', 'user2']);
    });

    it('参加表明の早いユーザーが優先されるべき', async () => {
      // Arrange: 参加登録時刻が異なるユーザーで選択する場合
      const eventId = 'event-early-registration-priority';
      const mockEvent: Event = {
        id: eventId,
        name: '早期参加表明優先テスト',
        description: '参加表明の早いユーザーが優先されることを確認',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user3', 'user1', 'user2'], // user3が最初に参加表明
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // 全員が同じ条件で利用可能
        { id: '300', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '301', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '302', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 参加表明順（user3, user1）が選ばれることを期待
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toEqual(['user3', 'user1']); // 早期参加表明順
    });
  });

  describe('🔴 Red Phase: 境界値・エッジケーステスト', () => {
    it('最小境界値：必要参加者1人・必要時間1時間で正常動作すべき', async () => {
      // Arrange: 最小の境界値
      const eventId = 'event-min-boundary';
      const mockEvent: Event = {
        id: eventId,
        name: '最小境界値テスト',
        description: '最小の参加者数・時間数でのテスト',
        requiredParticipants: 1, // 最小値
        requiredHours: 1, // 最小値（実際はeveningの3時間が最小）
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '400', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 最小値でもマッチング成功
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toEqual(['user1']);
      expect(result.matchedTimeSlots).toHaveLength(1);
    });

    it('ゼロ境界値：必要参加者0人の場合、適切にエラー処理すべき', async () => {
      // Arrange: 不正な境界値（0人必要）
      const eventId = 'event-zero-boundary';
      const mockEvent: Event = {
        id: eventId,
        name: 'ゼロ境界値テスト',
        description: '参加者0人必要という不正な値のテスト',
        requiredParticipants: 0, // 不正値
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue([]);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 不正値の場合の適切な処理
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数');
    });

    it('空の参加者配列：参加者が誰も登録されていない場合', async () => {
      // Arrange: 参加者配列が空
      const eventId = 'event-empty-participants';
      const mockEvent: Event = {
        id: eventId,
        name: '空参加者配列テスト',
        description: '参加者が誰も登録されていないケース',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: [], // 空配列
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue([]);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 空配列での適切な処理
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数が不足');
    });

    it('期間の境界値：開始日と終了日が同じ日の場合', async () => {
      // Arrange: 1日だけのイベント期間
      const eventId = 'event-single-day';
      const mockEvent: Event = {
        id: eventId,
        name: '単日期間テスト',
        description: '開始日と終了日が同じ場合のテスト',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'), // 同日
        periodEnd: new Date('2024-01-21'),   // 同日
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '500', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '501', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 単日でも正常動作
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.selectedParticipants).toHaveLength(2);
    });

    it('スケジュールデータなし：参加者はいるがスケジュール未登録の場合', async () => {
      // Arrange: 参加者はいるがスケジュールデータが空
      const eventId = 'event-no-schedules';
      const mockEvent: Event = {
        id: eventId,
        name: 'スケジュール未登録テスト',
        description: '参加者はいるがスケジュールが登録されていない場合',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-23'),
        status: 'open',
        reservationStatus: 'open',
      };

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue([]); // 空のスケジュール

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: スケジュール未登録での適切な処理
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数が不足');
    });
  });

  describe('🔴 Red Phase: 異常系・例外処理テスト', () => {
    it('データベースエラー：eventStorageでエラーが発生した場合', async () => {
      // Arrange: eventStorageがエラーを投げる
      const eventId = 'event-db-error';
      
      const { eventStorage } = await import('@/lib/eventStorage');
      vi.mocked(eventStorage.getEventById).mockRejectedValue(new Error('Database connection failed'));

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: データベースエラーでの適切な処理
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('マッチング処理中にエラーが発生しました');
    });

    it('データベースエラー：scheduleStorageでエラーが発生した場合', async () => {
      // Arrange: scheduleStorageがエラーを投げる
      const eventId = 'event-schedule-db-error';
      const mockEvent: Event = {
        id: eventId,
        name: 'スケジュールDBエラーテスト',
        description: 'スケジュール取得でエラーが発生する場合',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockRejectedValue(new Error('Schedule DB error'));

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: スケジュールDBエラーでの適切な処理
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('マッチング処理中にエラーが発生しました');
    });

    it('不正な日付データ：periodStartがperiodEndより後の場合', async () => {
      // Arrange: 不正な日付範囲
      const eventId = 'event-invalid-dates';
      const mockEvent: Event = {
        id: eventId,
        name: '不正日付テスト',
        description: '開始日が終了日より後の場合',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-25'), // 後の日付
        periodEnd: new Date('2024-01-21'),   // 前の日付
        status: 'open',
        reservationStatus: 'open',
      };

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue([]);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 不正な日付範囲での適切な処理
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数が不足');
    });

    it('メモリ不足シミュレーション：非常に大きな日付範囲の場合', async () => {
      // Arrange: 非常に大きな日付範囲（365日）
      const eventId = 'event-large-range';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31'); // 1年間
      
      const mockEvent: Event = {
        id: eventId,
        name: '大範囲日付テスト',
        description: '1年間という非常に大きな日付範囲',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2023-12-31'),
        updatedAt: new Date('2023-12-31'),
        participants: ['user1', 'user2'],
        deadline: new Date('2023-12-31'),
        periodStart: startDate,
        periodEnd: endDate,
        status: 'open',
        reservationStatus: 'open',
      };

      // 大量のスケジュールデータを生成（毎日1つずつ）
      const mockSchedules: MockUserSchedule[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        mockSchedules.push(
          { id: `${mockSchedules.length}`, userId: 'user1', date: new Date(d), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
          { id: `${mockSchedules.length + 1}`, userId: 'user2', date: new Date(d), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() }
        );
      }

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行（タイムアウト設定）
      const startTime = Date.now();
      const result = await matchingEngine.checkEventMatching(eventId);
      const endTime = Date.now();

      // Assert: 大量データでも適切に処理され、合理的な時間で完了
      expect(result.isMatched).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
      expect(result.selectedParticipants).toHaveLength(2);
    });
  });

  describe('🔴 Red Phase: 複雑なスケジュールパターンテスト', () => {
    it('部分的利用可能性：一部の参加者だけスケジュール登録している場合', async () => {
      // Arrange: 5人中3人だけスケジュール登録、2人必要
      const eventId = 'event-partial-schedules';
      const mockEvent: Event = {
        id: eventId,
        name: '部分スケジュール登録テスト',
        description: '一部の参加者だけスケジュールを登録している場合',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3', 'user4', 'user5'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-22'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // user1, user2, user3のみスケジュール登録（user4, user5は未登録）
        { id: '600', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '601', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() }, // 空いてない
        { id: '602', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: スケジュール登録済みの利用可能な参加者で2人確保
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toEqual(['user1', 'user3']); // 先着順
    });

    it('混在パターン：終日と夜間が混在する複雑なスケジュール', async () => {
      // Arrange: 異なる時間スロット形式が混在
      const eventId = 'event-mixed-slots';
      const mockEvent: Event = {
        id: eventId,
        name: '混在スケジュールテスト',
        description: '終日と夜間スロットが混在する場合',
        requiredParticipants: 3,
        requiredHours: 13, // 終日10時間 + 夜間3時間で13時間必要
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3', 'user4'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-23'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // 21日終日（10時間）: user1, user2, user3利用可能
        { id: '700', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '701', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '702', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '703', userId: 'user4', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        // 22日夜間（3時間）: user1, user2, user3利用可能
        { id: '704', userId: 'user1', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '705', userId: 'user2', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '706', userId: 'user3', date: new Date('2024-01-22'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '707', userId: 'user4', date: new Date('2024-01-22'), timeSlots: { evening: false, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 連続日程（21日終日 + 22日夜間 = 13時間）でマッチング成功
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      expect(result.matchedTimeSlots![0].timeSlot).toBe('fullday'); // 21日終日
      expect(result.matchedTimeSlots![1].timeSlot).toBe('evening'); // 22日夜間
      expect(result.selectedParticipants).toEqual(['user1', 'user2', 'user3']);
    });
  });

  describe('🔴 Red Phase: 日時関連エッジケース', () => {
    it('月境界：月末から翌月初めにかけての期間設定', async () => {
      // Arrange: 月境界をまたぐ期間
      const eventId = 'event-month-boundary';
      const mockEvent: Event = {
        id: eventId,
        name: '月境界テスト',
        description: '1月31日から2月1日にかけての期間',
        requiredParticipants: 2,
        requiredHours: 6,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-30'),
        periodStart: new Date('2024-01-31'), // 月末
        periodEnd: new Date('2024-02-01'),   // 翌月初め
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2024-01-31'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-01-31'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 月境界でも正常にマッチング
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots![0].date.getDate()).toBe(31); // 1月31日
      expect(result.matchedTimeSlots![0].date.getMonth()).toBe(0); // 1月（0-indexed）
    });

    it('年境界：12月31日から1月1日にかけての期間設定', async () => {
      // Arrange: 年をまたぐ期間
      const eventId = 'event-year-boundary';
      const mockEvent: Event = {
        id: eventId,
        name: '年境界テスト',
        description: '大晦日から元日にかけての期間',
        requiredParticipants: 2,
        requiredHours: 10,
        creatorId: 'creator1',
        createdAt: new Date('2023-12-20'),
        updatedAt: new Date('2023-12-20'),
        participants: ['user1', 'user2'],
        deadline: new Date('2023-12-30'),
        periodStart: new Date('2023-12-31'), // 大晦日
        periodEnd: new Date('2024-01-01'),   // 元日
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2023-12-31'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2023-12-31'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 年境界でも正常にマッチング
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots![0].date.getFullYear()).toBe(2023); // 2023年
      expect(result.matchedTimeSlots![0].date.getMonth()).toBe(11); // 12月（0-indexed）
      expect(result.matchedTimeSlots![0].date.getDate()).toBe(31);
    });

    it('うるう年：2月29日を含む期間設定', async () => {
      // Arrange: うるう年の2月29日を含む期間
      const eventId = 'event-leap-year';
      const mockEvent: Event = {
        id: eventId,
        name: 'うるう年テスト',
        description: '2024年2月29日を含む期間',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-02-25'),
        updatedAt: new Date('2024-02-25'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-02-28'),
        periodStart: new Date('2024-02-28'),
        periodEnd: new Date('2024-02-29'), // うるう年の2月29日
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2024-02-29'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-02-29'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: うるう年の2月29日でも正常にマッチング
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots![0].date.getMonth()).toBe(1); // 2月（0-indexed）
      expect(result.matchedTimeSlots![0].date.getDate()).toBe(29); // 29日
      expect(result.matchedTimeSlots![0].timeSlot).toBe('evening');
    });

    it('日付文字列の不正フォーマット：無効な日付文字列の処理', async () => {
      // Arrange: 不正な日付を持つスケジュール
      const eventId = 'event-invalid-date';
      const mockEvent: Event = {
        id: eventId,
        name: '不正日付テスト',
        description: '無効な日付文字列の処理テスト',
        requiredParticipants: 1,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      // 不正な日付オブジェクトを作成（JavaScriptのInvalid Date）
      const invalidDate = new Date('invalid-date-string');
      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: invalidDate, timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 不正な日付の場合はマッチング失敗
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数が不足');
    });

    it('サマータイム切り替え：時刻変更が発生する日程の処理', async () => {
      // Arrange: サマータイム切り替え日（アメリカ時間の例：3月第2日曜日）
      const eventId = 'event-dst';
      const mockEvent: Event = {
        id: eventId,
        name: 'サマータイムテスト',
        description: 'サマータイム切り替え日の処理',
        requiredParticipants: 2,
        requiredHours: 6,
        creatorId: 'creator1',
        createdAt: new Date('2024-03-05'),
        updatedAt: new Date('2024-03-05'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-03-09'),
        periodStart: new Date('2024-03-10'), // 2024年のサマータイム開始日
        periodEnd: new Date('2024-03-10'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2024-03-10'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-03-10'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: サマータイム切り替え日でも正常にマッチング
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots![0].timeSlot).toBe('fullday');
    });
  });

  describe('🔴 Red Phase: ランダム抽選機能テスト', () => {
    it('同条件の候補が複数ある場合：決定的な抽選結果を提供すべき', async () => {
      // Arrange: 全く同じ条件の候補が複数存在するケース
      const eventId = 'event-lottery';
      const mockEvent: Event = {
        id: eventId,
        name: 'ランダム抽選テスト',
        description: '同条件の候補からランダムに選択',
        requiredParticipants: 2,
        requiredHours: 3, // 3時間必要
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3', 'user4'], // 4人登録、2人必要
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-25'),
        status: 'open',
        reservationStatus: 'open',
      };

      // 同じ日に全員が夜間利用可能（同一条件）
      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:00:00Z'), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:05:00Z'), updatedAt: new Date() }, 
        { id: '3', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:10:00Z'), updatedAt: new Date() },
        { id: '4', userId: 'user4', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:15:00Z'), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 先着順の原則に従って最初の2人が選ばれる
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toEqual(['user1', 'user2']); // 先着順
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots![0].timeSlot).toBe('evening');
    });

    it('抽選機能の一貫性：同一条件での複数回実行結果の安定性', async () => {
      // Arrange: 抽選が発生する条件を設定
      const eventId = 'event-consistency';
      const mockEvent: Event = {
        id: eventId,
        name: '抽選一貫性テスト',
        description: '同じ入力に対して一貫した結果を返すかテスト',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:00:00Z'), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:00:00Z'), updatedAt: new Date() }, // 同時刻
        { id: '3', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:00:00Z'), updatedAt: new Date() }, // 同時刻
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: 同じ条件で複数回実行
      const result1 = await matchingEngine.checkEventMatching(eventId);
      const result2 = await matchingEngine.checkEventMatching(eventId);
      const result3 = await matchingEngine.checkEventMatching(eventId);

      // Assert: 一貫した結果を返す（決定論的）
      expect(result1.isMatched).toBe(true);
      expect(result2.isMatched).toBe(true);
      expect(result3.isMatched).toBe(true);
      
      // 同じ参加者の組み合わせを返す（順序は配列順による決定論的選択）
      expect(result1.selectedParticipants).toEqual(result2.selectedParticipants);
      expect(result2.selectedParticipants).toEqual(result3.selectedParticipants);
      
      // 2人が選択されること
      expect(result1.selectedParticipants).toHaveLength(2);
    });

    it('抽選対象の境界条件：最小必要人数と利用可能人数が一致する場合', async () => {
      // Arrange: 必要人数と利用可能人数がぴったり一致
      const eventId = 'event-exact-match';
      const mockEvent: Event = {
        id: eventId,
        name: '境界抽選テスト',
        description: '必要人数と利用可能人数が一致する場合',
        requiredParticipants: 3, // 3人必要
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2', 'user3'], // 3人登録
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:00:00Z'), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:05:00Z'), updatedAt: new Date() },
        { id: '3', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date('2024-01-19T10:10:00Z'), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 抽選不要で全員選択
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toEqual(['user1', 'user2', 'user3']);
      expect(result.selectedParticipants).toHaveLength(3);
    });
  });

  describe('🔴 Red Phase: 重要な漏れているテストケース', () => {
    it('タイムゾーン問題：異なるタイムゾーンの日付が正しく比較される', async () => {
      // Arrange: 異なるタイムゾーンで作成された同じ日の日付
      const eventId = 'event-timezone';
      const mockEvent: Event = {
        id: eventId,
        name: 'タイムゾーンテスト',
        description: '異なるタイムゾーンでの日付比較',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21T00:00:00.000Z'), // UTC
        periodEnd: new Date('2024-01-21T23:59:59.999Z'),   // UTC
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // JST で作成された同じ日のスケジュール（時刻が異なるが同じ日）
        { id: '1', userId: 'user1', date: new Date('2024-01-21T15:00:00.000+09:00'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-01-21T06:00:00.000Z'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: タイムゾーンが異なっても同じ日として認識されマッチング成功
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toHaveLength(2);
    });

    it('requiredHours検証：負の値が設定された場合の処理', async () => {
      // Arrange: 不正な必要時間（負の値）
      const eventId = 'event-negative-hours';
      const mockEvent: Event = {
        id: eventId,
        name: '負の時間テスト',
        description: '必要時間が負の値の場合',
        requiredParticipants: 2,
        requiredHours: -1, // 不正値
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 負の時間でもエラーハンドリングされる
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数が不足');
    });

    it('空きスロット計算：fullday と evening の競合ケース', async () => {
      // Arrange: 終日空きがある場合、evening も利用可能とすべきかのテスト
      const eventId = 'event-slot-overlap';
      const mockEvent: Event = {
        id: eventId,
        name: 'スロット重複テスト',
        description: '終日空きがある場合の evening 利用可能性',
        requiredParticipants: 2,
        requiredHours: 3, // evening で満たせる
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user1', 'user2'],
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        // user1: 終日空いている（eveningも含む）
        { id: '1', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: false, fullday: true }, createdAt: new Date(), updatedAt: new Date() },
        // user2: 夜間のみ空いている  
        { id: '2', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: マッチング判定実行
      const result = await matchingEngine.checkEventMatching(eventId);

      // Assert: 終日空きより夜間空きが優先される（時間が短いため効率的）
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots![0].timeSlot).toBe('evening');
    });

    it('参加者順序の一貫性：同じ入力で常に同じ順序で選択', async () => {
      // Arrange: 複数回実行して同じ結果が得られるかテスト
      const eventId = 'event-consistency-order';
      const mockEvent: Event = {
        id: eventId,
        name: '順序一貫性テスト',
        description: '参加者選択順序の一貫性確認',
        requiredParticipants: 2,
        requiredHours: 3,
        creatorId: 'creator1',
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-19'),
        participants: ['user3', 'user1', 'user2'], // 意図的にソートされていない順序
        deadline: new Date('2024-01-20'),
        periodStart: new Date('2024-01-21'),
        periodEnd: new Date('2024-01-21'),
        status: 'open',
        reservationStatus: 'open',
      };

      const mockSchedules: MockUserSchedule[] = [
        { id: '1', userId: 'user1', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: 'user2', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', userId: 'user3', date: new Date('2024-01-21'), timeSlots: { evening: true, fullday: false }, createdAt: new Date(), updatedAt: new Date() },
      ];

      const { eventStorage } = await import('@/lib/eventStorage');
      const { scheduleStorage } = await import('@/lib/scheduleStorage');
      
      vi.mocked(eventStorage.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(scheduleStorage.getSchedulesByUserIds).mockResolvedValue(mockSchedules);

      // Act: 複数回実行
      const result1 = await matchingEngine.checkEventMatching(eventId);
      const result2 = await matchingEngine.checkEventMatching(eventId);
      const result3 = await matchingEngine.checkEventMatching(eventId);

      // Assert: 毎回同じ順序で選択される（参加者配列の順序に従う）
      expect(result1.selectedParticipants).toEqual(['user3', 'user1']); // 参加者配列順
      expect(result2.selectedParticipants).toEqual(result1.selectedParticipants);
      expect(result3.selectedParticipants).toEqual(result1.selectedParticipants);
    });
  });
});