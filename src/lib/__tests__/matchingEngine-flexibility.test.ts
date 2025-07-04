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

describe('🔴 Red Phase: イベント設定柔軟化 - マッチング戦略選択', () => {
  const mockEventStorage = vi.mocked(eventStorage);
  const mockUserStorage = vi.mocked(userStorage);
  const mockScheduleStorage = vi.mocked(scheduleStorage);
  
  let mockUser1: string;
  let mockUser2: string;
  let mockCreator: string;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mockUser1 = `user-1-${testRunId}`;
    mockUser2 = `user-2-${testRunId}`;
    mockCreator = `creator-1-${testRunId}`;

    // Setup basic mocks (simplified for this test file)
    mockUserStorage.createUser.mockResolvedValue({
      id: mockUser1,
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
        // 🟢 Green Phase: 新しいフィールドをデフォルト値で設定
        matchingStrategy: request.matchingStrategy || 'consecutive',
        timeSlotRestriction: request.timeSlotRestriction || 'both',
        minimumConsecutive: request.minimumConsecutive || 1
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
      return true;
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

  describe('マッチング戦略: consecutive（連続優先）', () => {
    it('連続優先モードで同日の昼→夜連続が分散した日程より優先されるべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Consecutive Test Event',
        description: 'Test consecutive matching strategy',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        // 🟢 Green Phase: 型定義されたフィールドを使用
        matchingStrategy: 'consecutive'
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // スケジュール設定: 連続可能日（1日目）+ 分散日程（1日目+3日目）
      const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const day3 = new Date(Date.now() + 72 * 60 * 60 * 1000);
      
      for (const userId of [mockCreator, mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          [day1.toISOString().split('T')[0], day3.toISOString().split('T')[0]],
          { daytime: true, evening: true }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      
      // 🟢 Green Phase: 連続性をチェックするカスタムマッチャー
      expect(result.matchedTimeSlots).toHaveConsecutiveTimeSlots();
      
      // 同日の昼→夜連続であることを期待
      const firstSlot = result.matchedTimeSlots[0];
      const secondSlot = result.matchedTimeSlots[1];
      expect(firstSlot.date.getTime()).toBe(secondSlot.date.getTime()); // 同日
      expect(firstSlot.timeSlot).toBe('daytime');
      expect(secondSlot.timeSlot).toBe('evening');
    });

    it('連続優先モードで最低連続コマ数が確保されるべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Minimum Consecutive Test',
        description: 'Test minimum consecutive requirement',
        requiredParticipants: 2,
        requiredTimeSlots: 3,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        matchingStrategy: 'consecutive',
        minimumConsecutive: 2 // 最低2コマは連続である必要
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // バラバラの3日程を設定（連続性なし）
      const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const day3 = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const day5 = new Date(Date.now() + 120 * 60 * 60 * 1000);
      
      for (const userId of [mockCreator, mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          [
            day1.toISOString().split('T')[0],
            day3.toISOString().split('T')[0], 
            day5.toISOString().split('T')[0]
          ],
          { daytime: true, evening: false }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      // 最低連続コマ数が確保できないため成立しない
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('minimum consecutive requirement not met');
    });
  });

  describe('マッチング戦略: flexible（分散許可）', () => {
    it('分散許可モードで非連続でも必要コマ数が確保されれば成立すべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Flexible Test Event',
        description: 'Test flexible matching strategy',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        matchingStrategy: 'flexible'
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 非連続の2日程を設定（月曜日と水曜日）
      const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const day3 = new Date(Date.now() + 72 * 60 * 60 * 1000);
      
      for (const userId of [mockCreator, mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          [day1.toISOString().split('T')[0], day3.toISOString().split('T')[0]],
          { daytime: true, evening: false }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      
      // 🟢 Green Phase: 非連続でも成立することを確認するカスタムマッチャー
      expect(result.matchedTimeSlots).toAllowNonConsecutiveTimeSlots();
    });

    it('分散許可モードで連続性より早い日程を優先すべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Flexible Earliest Test',
        description: 'Test flexible mode prioritizes earliest dates',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        matchingStrategy: 'flexible'
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 3日程設定: 1日目+5日目（早い）vs 3日目+4日目（連続）
      const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const day3 = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const day4 = new Date(Date.now() + 96 * 60 * 60 * 1000);
      const day5 = new Date(Date.now() + 120 * 60 * 60 * 1000);
      
      for (const userId of [mockCreator, mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          [
            day1.toISOString().split('T')[0], 
            day3.toISOString().split('T')[0],
            day4.toISOString().split('T')[0],
            day5.toISOString().split('T')[0]
          ],
          { daytime: true, evening: false }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      
      // flexibleモードでは早い日程を優先（1日目+3日目を期待）
      const dates = result.matchedTimeSlots.map(slot => slot.date.getTime()).sort();
      expect(dates[0]).toBe(day1.getTime());
      expect(dates[1]).toBe(day3.getTime()); // 連続性より早さを優先
    });
  });

  describe('時間帯制限: daytime_only（昼間のみ）', () => {
    it('昼間のみ制限で夜間の時間帯が除外されるべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Daytime Only Test',
        description: 'Test daytime only restriction',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        timeSlotRestriction: 'daytime_only'
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 昼・夜両方の時間帯で空き時間を設定
      const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      for (const userId of [mockCreator, mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          [day1.toISOString().split('T')[0], day2.toISOString().split('T')[0]],
          { daytime: true, evening: true } // 両方空いている
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      
      // 全て昼間の時間帯であることを確認
      for (const slot of result.matchedTimeSlots) {
        expect(slot.timeSlot).toBe('daytime');
      }
    });

    it('昼間のみ制限で昼間に十分な空きがない場合は成立しないべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Daytime Only Insufficient Test',
        description: 'Test daytime only with insufficient daytime slots',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        timeSlotRestriction: 'daytime_only'
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 昼間1コマ、夜間2コマの空き（昼間が不足）
      const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      for (const userId of [mockCreator, mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          [day1.toISOString().split('T')[0]],
          { daytime: true, evening: false } // 昼間1コマのみ
        );
        await scheduleStorage.setAvailability(
          userId,
          [day2.toISOString().split('T')[0]],
          { daytime: false, evening: true } // 夜間のみ（制限により使えない）
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('insufficient daytime slots');
    });
  });

  describe('時間帯制限: evening_only（夜間のみ）', () => {
    it('夜間のみ制限で昼間の時間帯が除外されるべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Evening Only Test',
        description: 'Test evening only restriction',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        timeSlotRestriction: 'evening_only'
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 昼・夜両方の時間帯で空き時間を設定
      const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      for (const userId of [mockCreator, mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          [day1.toISOString().split('T')[0]],
          { daytime: true, evening: true } // 両方空いている
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(1);
      
      // 夜間の時間帯であることを確認
      expect(result.matchedTimeSlots[0].timeSlot).toBe('evening');
    });
  });
});

// 🟢 Green Phase: カスタムマッチャーは別ファイルで定義済み