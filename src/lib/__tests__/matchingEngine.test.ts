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
});