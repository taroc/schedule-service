// 🔴 Red Phase: Flexible Participants Matching Engine Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchingEngine } from '@/lib/matchingEngine';
import { eventStorage } from '@/lib/eventStorage';
import { scheduleStorage } from '@/lib/scheduleStorage';
import type { Event } from '@/types/event';
import type { UserSchedule } from '@/types/schedule';

// モック設定
vi.mock('@/lib/eventStorage');
vi.mock('@/lib/scheduleStorage');

const mockedEventStorage = vi.mocked(eventStorage);
const mockedScheduleStorage = vi.mocked(scheduleStorage);

describe('🔴 Red Phase: Flexible Participants Matching Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockEvent = (overrides: Partial<Event> = {}): Event => ({
    id: 'event1',
    name: 'テストイベント',
    description: 'テスト用イベント',
    requiredParticipants: 3, // 下位互換性のため
    minParticipants: 3,
    maxParticipants: null, // 無制限
    requiredHours: 3,
    creatorId: 'creator1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    status: 'open',
    participants: ['creator1', 'user1', 'user2', 'user3', 'user4'], // 5人参加
    deadline: new Date('2024-01-15'),
    periodStart: new Date('2024-01-16'),
    periodEnd: new Date('2024-01-20'),
    reservationStatus: 'open',
    ...overrides
  });

  const createMockSchedule = (userId: string, date: Date, timeSlots: { evening: boolean; fullday: boolean }): UserSchedule => ({
    id: `schedule-${userId}-${date.toISOString().split('T')[0]}`,
    userId,
    date,
    timeSlots,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('参加者数が多い方を優先するマッチング', () => {
    it('参加者数がより多い日程を優先して選択すべき', async () => {
      // Arrange: 異なる参加者数の時間スロットがある状況
      const mockEvent = createMockEvent({
        minParticipants: 2,
        maxParticipants: 4,
        requiredHours: 3,
        participants: ['creator1', 'user1', 'user2', 'user3', 'user4', 'user5'] // 6人参加
      });

      // 1/16: 3人利用可能（evening）
      // 1/17: 5人利用可能（evening）← こちらを優先すべき
      const mockSchedules: UserSchedule[] = [
        // 1/16 - 3人のみ利用可能
        createMockSchedule('creator1', new Date('2024-01-16'), { evening: true, fullday: false }),
        createMockSchedule('user1', new Date('2024-01-16'), { evening: true, fullday: false }),
        createMockSchedule('user2', new Date('2024-01-16'), { evening: true, fullday: false }),
        // 1/17 - 5人利用可能
        createMockSchedule('creator1', new Date('2024-01-17'), { evening: true, fullday: false }),
        createMockSchedule('user1', new Date('2024-01-17'), { evening: true, fullday: false }),
        createMockSchedule('user2', new Date('2024-01-17'), { evening: true, fullday: false }),
        createMockSchedule('user3', new Date('2024-01-17'), { evening: true, fullday: false }),
        createMockSchedule('user4', new Date('2024-01-17'), { evening: true, fullday: false }),
      ];

      mockedEventStorage.getEventById.mockResolvedValue(mockEvent);
      mockedScheduleStorage.getSchedulesByUserIds.mockResolvedValue(mockSchedules);

      // Act
      const result = await matchingEngine.checkEventMatching('event1');

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toHaveLength(4); // maxParticipantsが4なので4人選択
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots![0].date.toISOString().split('T')[0]).toBe('2024-01-17'); // 参加者が多い日を選択
    });

    it('最大参加者数制限がない場合は利用可能な全員を選択すべき', async () => {
      // Arrange: 最大参加者数が無制限（null）の場合
      const mockEvent = createMockEvent({
        minParticipants: 2,
        maxParticipants: null, // 無制限
        requiredHours: 3,
        participants: ['creator1', 'user1', 'user2', 'user3', 'user4', 'user5'] // 6人参加
      });

      // 全員が1/16に利用可能
      const mockSchedules: UserSchedule[] = mockEvent.participants.map(userId =>
        createMockSchedule(userId, new Date('2024-01-16'), { evening: true, fullday: false })
      );

      mockedEventStorage.getEventById.mockResolvedValue(mockEvent);
      mockedScheduleStorage.getSchedulesByUserIds.mockResolvedValue(mockSchedules);

      // Act
      const result = await matchingEngine.checkEventMatching('event1');

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toHaveLength(6); // 全員選択
    });

    it('最大参加者数制限がある場合は制限内で最多を選択すべき', async () => {
      // Arrange: 最大参加者数制限がある場合
      const mockEvent = createMockEvent({
        minParticipants: 2,
        maxParticipants: 3, // 最大3人
        requiredHours: 3,
        participants: ['creator1', 'user1', 'user2', 'user3', 'user4'] // 5人参加
      });

      // 全員が1/16に利用可能（5人）
      const mockSchedules: UserSchedule[] = mockEvent.participants.map(userId =>
        createMockSchedule(userId, new Date('2024-01-16'), { evening: true, fullday: false })
      );

      mockedEventStorage.getEventById.mockResolvedValue(mockEvent);
      mockedScheduleStorage.getSchedulesByUserIds.mockResolvedValue(mockSchedules);

      // Act
      const result = await matchingEngine.checkEventMatching('event1');

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toHaveLength(3); // maxParticipantsの制限で3人のみ
    });
  });

  describe('複数日程での参加者数優先マッチング', () => {
    it('複数日必要な場合でも参加者数が多い組み合わせを優先すべき', async () => {
      // Arrange: 6時間必要（2日間の組み合わせが必要）
      const mockEvent = createMockEvent({
        minParticipants: 2,
        maxParticipants: null,
        requiredHours: 6, // 2日間必要
        participants: ['creator1', 'user1', 'user2', 'user3'] // 4人参加
      });

      const mockSchedules: UserSchedule[] = [
        // パターン1: 1/16(2人) + 1/17(2人) = 2人でマッチ
        createMockSchedule('creator1', new Date('2024-01-16'), { evening: true, fullday: false }),
        createMockSchedule('user1', new Date('2024-01-16'), { evening: true, fullday: false }),
        createMockSchedule('creator1', new Date('2024-01-17'), { evening: true, fullday: false }),
        createMockSchedule('user1', new Date('2024-01-17'), { evening: true, fullday: false }),
        
        // パターン2: 1/18(4人) + 1/19(4人) = 4人でマッチ ← こちらを優先すべき
        ...mockEvent.participants.map(userId => 
          createMockSchedule(userId, new Date('2024-01-18'), { evening: true, fullday: false })
        ),
        ...mockEvent.participants.map(userId => 
          createMockSchedule(userId, new Date('2024-01-19'), { evening: true, fullday: false })
        ),
      ];

      mockedEventStorage.getEventById.mockResolvedValue(mockEvent);
      mockedScheduleStorage.getSchedulesByUserIds.mockResolvedValue(mockSchedules);

      // Act
      const result = await matchingEngine.checkEventMatching('event1');

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toHaveLength(4); // より多い参加者数
      expect(result.matchedTimeSlots).toHaveLength(2);
      // 1/18, 1/19の組み合わせが選択されているか確認
      const selectedDates = result.matchedTimeSlots!.map(ts => ts.date.toISOString().split('T')[0]).sort();
      expect(selectedDates).toEqual(['2024-01-18', '2024-01-19']);
    });
  });

  describe('最小参加者数を満たさない場合', () => {
    it('最小参加者数を満たさない場合はマッチング失敗すべき', async () => {
      // Arrange
      const mockEvent = createMockEvent({
        minParticipants: 5, // 最小5人必要
        participants: ['creator1', 'user1', 'user2'] // 3人しかいない
      });

      const mockSchedules: UserSchedule[] = mockEvent.participants.map(userId =>
        createMockSchedule(userId, new Date('2024-01-16'), { evening: true, fullday: false })
      );

      mockedEventStorage.getEventById.mockResolvedValue(mockEvent);
      mockedScheduleStorage.getSchedulesByUserIds.mockResolvedValue(mockSchedules);

      // Act
      const result = await matchingEngine.checkEventMatching('event1');

      // Assert
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('参加者数が不足');
    });
  });

  describe('参加者の選択順序', () => {
    it('参加人数が同じ場合は先着順（参加登録順）で選択すべき', async () => {
      // Arrange
      const mockEvent = createMockEvent({
        minParticipants: 2,
        maxParticipants: 2, // ちょうど2人選択
        participants: ['creator1', 'user1', 'user2', 'user3'] // 参加登録順
      });

      // 全員が利用可能
      const mockSchedules: UserSchedule[] = mockEvent.participants.map(userId =>
        createMockSchedule(userId, new Date('2024-01-16'), { evening: true, fullday: false })
      );

      mockedEventStorage.getEventById.mockResolvedValue(mockEvent);
      mockedScheduleStorage.getSchedulesByUserIds.mockResolvedValue(mockSchedules);

      // Act
      const result = await matchingEngine.checkEventMatching('event1');

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.selectedParticipants).toHaveLength(2);
      // 先着順で選択されているか確認
      expect(result.selectedParticipants).toEqual(['creator1', 'user1']);
    });
  });
});