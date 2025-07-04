import { describe, it, expect, beforeEach, vi } from 'vitest';
import { matchingEngine } from '../matchingEngine';
import { eventStorage } from '../eventStorage';
import { userStorage } from '../userStorage';
import { scheduleStorage } from '../scheduleStorage';
import { CreateEventRequest, Event } from '@/types/event';
import '../../test/customMatchers';

// Mock the storage modules
vi.mock('../eventStorage');
vi.mock('../userStorage');
vi.mock('../scheduleStorage');

describe('🔴 Red Phase: 成立条件の詳細設定', () => {
  const mockEventStorage = vi.mocked(eventStorage);
  const mockUserStorage = vi.mocked(userStorage);
  const mockScheduleStorage = vi.mocked(scheduleStorage);
  
  let mockCreator: string;
  let mockUsers: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mockCreator = `creator-${testRunId}`;
    mockUsers = Array.from({length: 6}, (_, i) => `user-${i + 1}-${testRunId}`);

    // Setup basic mocks
    mockUserStorage.createUser.mockResolvedValue({
      id: mockUsers[0],
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const events = new Map<string, Event>();
    let eventIdCounter = 0;
    
    mockEventStorage.createEvent.mockImplementation(async (request, creatorId) => {
      eventIdCounter++;
      const event = {
        id: `event-${Date.now()}-${eventIdCounter}`,
        name: request.name,
        description: request.description,
        requiredParticipants: request.requiredParticipants,
        requiredTimeSlots: request.requiredTimeSlots || 1,
        creatorId,
        status: 'open',
        participants: [creatorId],
        deadline: request.deadline,
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        reservationStatus: 'open',
        // Phase 1 & 2 フィールド（デフォルト値）
        matchingStrategy: (request as CreateEventRequest & { matchingStrategy?: string }).matchingStrategy || 'consecutive',
        timeSlotRestriction: (request as CreateEventRequest & { timeSlotRestriction?: string }).timeSlotRestriction || 'both',
        minimumConsecutive: (request as CreateEventRequest & { minimumConsecutive?: number }).minimumConsecutive || 1,
        participantSelectionStrategy: request.participantSelectionStrategy || 'first_come',
        minParticipants: request.minParticipants || request.requiredParticipants,
        maxParticipants: request.maxParticipants,
        optimalParticipants: request.optimalParticipants,
        selectionDeadline: request.selectionDeadline,
        lotterySeed: request.lotterySeed,
        // 🔴 Red Phase: Phase 3 新フィールド（まだ実装されていない）
        allowPartialMatching: request.allowPartialMatching || false,
        minimumTimeSlots: request.minimumTimeSlots,
        suggestMultipleOptions: request.suggestMultipleOptions || false,
        maxSuggestions: request.maxSuggestions,
        preferredDates: request.preferredDates,
        dateWeights: request.dateWeights,
        requireAllParticipants: request.requireAllParticipants || false,
        fallbackStrategy: request.fallbackStrategy
      } as Event;
      events.set(event.id, event);
      return event;
    });
    
    mockEventStorage.getEventById.mockImplementation(async (eventId) => {
      return events.get(eventId) || null;
    });
    
    mockEventStorage.addParticipant.mockImplementation(async (eventId, userId) => {
      const event = events.get(eventId);
      if (event && !event.participants.includes(userId)) {
        event.participants.push(userId);
        events.set(eventId, event);
      }
      return { success: true };
    });
    
    mockEventStorage.updateEventStatus.mockImplementation(async (eventId, status, matchedTimeSlots) => {
      const event = events.get(eventId);
      if (event) {
        event.status = status;
        if (matchedTimeSlots) {
          event.matchedTimeSlots = matchedTimeSlots;
        }
        events.set(eventId, event);
        return true;
      }
      return false;
    });

    // Setup schedule storage mock
    const schedules = new Map<string, {
      userId: string;
      date: string;
      timeSlotsDaytime: boolean;
      timeSlotsEvening: boolean;
    }>();
    
    mockScheduleStorage.setAvailability.mockImplementation(async (userId, dates, timeSlots) => {
      for (const date of dates) {
        const key = `${userId}:${date}`;
        schedules.set(key, {
          userId,
          date,
          timeSlotsDaytime: timeSlots.daytime,
          timeSlotsEvening: timeSlots.evening
        });
      }
    });
    
    mockScheduleStorage.getUserSchedulesByDateRange.mockImplementation(async (userId, startDate, endDate) => {
      const userSchedules = Array.from(schedules.values())
        .filter(s => s.userId === userId)
        .filter(s => {
          const scheduleDate = new Date(s.date + 'T00:00:00.000Z');
          const start = new Date(startDate.getTime());
          const end = new Date(endDate.getTime());
          
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          scheduleDate.setHours(0, 0, 0, 0);
          
          return scheduleDate >= start && scheduleDate <= end;
        });
      
      return userSchedules.map(s => ({
        id: `${s.userId}-${s.date}`,
        userId: s.userId,
        date: new Date(s.date + 'T00:00:00.000Z'),
        timeSlots: {
          daytime: s.timeSlotsDaytime,
          evening: s.timeSlotsEvening
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    });
  });

  describe('部分成立許可システム', () => {
    it('部分成立許可時、必要コマ数未満でも最低コマ数を満たせば成立すべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Partial Matching Test Event',
        description: 'Test partial matching functionality',
        requiredParticipants: 3,
        requiredTimeSlots: 4, // 4コマ必要
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        allowPartialMatching: true, // 🔴 Red Phase: 部分成立許可
        minimumTimeSlots: 2 // 最低2コマで成立
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      // 3名が参加
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);

      // 2コマのみ共通で空いている状況（4コマ未満だが最低2コマは満たす）
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const allParticipants = [mockCreator, mockUsers[0], mockUsers[1]];
      
      for (const userId of allParticipants) {
        // 2日分の昼間のみ空いている
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0], dayAfter.toISOString().split('T')[0]],
          { daytime: true, evening: false }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2); // 最低コマ数を満たす
      // 🔴 Red Phase: 部分成立の実装が期待されている
    });

    it('部分成立許可でも最低コマ数を下回る場合は成立しないべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Insufficient Slots Test',
        description: 'Test minimum slots requirement',
        requiredParticipants: 3,
        requiredTimeSlots: 4,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        allowPartialMatching: true,
        minimumTimeSlots: 3 // 最低3コマ必要
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);

      // 1コマのみ共通で空いている（最低3コマを下回る）
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const allParticipants = [mockCreator, mockUsers[0], mockUsers[1]];
      
      for (const userId of allParticipants) {
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0]],
          { daytime: true, evening: false }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('minimum time slots');
    });
  });

  describe('複数候補提示機能', () => {
    it('複数候補提示モードで複数の日程案を生成すべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Multiple Options Test Event',
        description: 'Test multiple scheduling options',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        suggestMultipleOptions: true, // 🔴 Red Phase: 複数候補提示
        maxSuggestions: 3 // 最大3つの候補
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);

      // 複数の日程で空いている状況
      const dates = [];
      for (let i = 1; i <= 5; i++) {
        const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      const allParticipants = [mockCreator, mockUsers[0], mockUsers[1]];
      for (const userId of allParticipants) {
        await scheduleStorage.setAvailability(userId, dates, { daytime: true, evening: true });
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      // 🔴 Red Phase: 複数候補が result.suggestions に含まれることを期待
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toHaveLength(3); // maxSuggestions分
      expect(result.suggestions![0].score).toBeGreaterThan(0);
    });
  });

  describe('優先日程設定', () => {
    it('優先日程が高い重みを持つ日付を優先して選択すべき', async () => {
      // Arrange
      const preferredDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const preferredDateStr = preferredDate.toISOString().split('T')[0];
      
      const eventRequest = {
        name: 'Preferred Dates Test Event',
        description: 'Test preferred dates weighting',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        preferredDates: [preferredDateStr], // 🔴 Red Phase: 優先日程設定
        dateWeights: {
          [preferredDateStr]: 2.0 // 2倍の重み
        }
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);

      // 複数日程で空いているが、優先日程を含む状況
      const dates = [];
      for (let i = 1; i <= 5; i++) {
        const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      const allParticipants = [mockCreator, mockUsers[0], mockUsers[1]];
      for (const userId of allParticipants) {
        await scheduleStorage.setAvailability(userId, dates, { daytime: true, evening: true });
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      // 🔴 Red Phase: 優先日程が選択されることを期待
      const selectedDates = result.matchedTimeSlots.map(ts => ts.date.toISOString().split('T')[0]);
      expect(selectedDates).toContain(preferredDateStr);
    });
  });

  describe('高度なマッチング条件', () => {
    it('全参加者合意必須の場合、参加者全員のスケジュールが一致する時のみ成立すべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'All Participants Required Test',
        description: 'Test require all participants option',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        requireAllParticipants: true // 🔴 Red Phase: 全参加者合意必須
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      // 4名が参加（必要な3名を上回る）
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);
      await eventStorage.addParticipant(event.id, mockUsers[2]);

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      // 3名のみ共通で空いている（1名は不参加）
      const availableParticipants = [mockCreator, mockUsers[0], mockUsers[1]];
      for (const userId of availableParticipants) {
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0], dayAfter.toISOString().split('T')[0]],
          { daytime: true, evening: true }
        );
      }
      
      // mockUsers[2] は空いていない
      await scheduleStorage.setAvailability(
        mockUsers[2],
        [tomorrow.toISOString().split('T')[0], dayAfter.toISOString().split('T')[0]],
        { daytime: false, evening: false }
      );

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      // 🔴 Red Phase: 全参加者の合意が必要なので成立しないことを期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('all participants required');
    });
  });
});

// 🔴 Red Phase: カスタムマッチャーの拡張（成立条件詳細設定用）
// Note: カスタムマッチャーの型定義は src/test/customMatchers.ts に統合済み