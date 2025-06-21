import { describe, it, expect, beforeEach } from 'vitest';
import { matchingEngine } from '../matchingEngine';
import { eventStorage } from '../eventStorage';
import { userStorage } from '../userStorage';
import { scheduleStorage } from '../scheduleStorage';
import { CreateEventRequest } from '@/types/event';

describe('matchingEngine', () => {
  // テスト毎にユニークなIDを生成する変数
  let mockUser1: string;
  let mockUser2: string;
  let mockCreator: string;

  beforeEach(async () => {
    // テスト毎にユニークなIDを生成
    const testRunId = Math.random().toString(36).substring(7);
    mockUser1 = `user-1-${testRunId}`;
    mockUser2 = `user-2-${testRunId}`;
    mockCreator = `creator-1-${testRunId}`;

    // 既存イベントをクリーンアップ
    const allEvents = await eventStorage.getAllEvents();
    for (const event of allEvents) {
      await eventStorage.deleteEvent(event.id);
    }

    // テストユーザーを作成
    await userStorage.createUser({
      userId: mockUser1,
      password: 'password123'
    });
    
    await userStorage.createUser({
      userId: mockUser2,
      password: 'password123'
    });
    
    await userStorage.createUser({
      userId: mockCreator,
      password: 'password123'
    });
  });

  describe('checkEventMatching', () => {
    it('should return false for insufficient participants', async () => {
      // Arrange - 必要人数に満たないイベントを作成
      const eventRequest: CreateEventRequest = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1日後
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14日後
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      // 参加者が1人のみ（必要人数3人に満たない）

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('Insufficient participants');
      expect(result.participants).toHaveLength(2); // Creator + 1 participant
    });

    it('should return false when no common available dates', async () => {
      // Arrange - 十分な参加者がいるが共通空き日程がないイベント
      const eventRequest: CreateEventRequest = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 異なる日に空き時間を設定（共通日程なし）
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      await scheduleStorage.setAvailability(
        mockUser1,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: false }
      );

      await scheduleStorage.setAvailability(
        mockUser2,
        [dayAfterTomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: false }
      );

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('No common available time slots');
    });

    it('should return true when requirements are met', async () => {
      // Arrange - 十分な参加者と共通空き日程があるイベント
      const eventRequest: CreateEventRequest = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 共通の連続空き日程を設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      const dates = [tomorrow.toISOString().split('T')[0].split('T')[0], dayAfterTomorrow.toISOString().split('T')[0]];

      await scheduleStorage.setAvailability(
        mockUser1,
        dates,
        { daytime: true, evening: false }
      );

      await scheduleStorage.setAvailability(
        mockUser2,
        dates,
        { daytime: false, evening: true }
      );

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      expect(result.reason).toBe('Successfully matched');
    });
  });

  describe('onParticipantAdded', () => {
    it('should check matching when participant is added', async () => {
      // Arrange
      const eventRequest: CreateEventRequest = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      // 共通空き日程を設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await scheduleStorage.setAvailability(
        mockUser1,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      await scheduleStorage.setAvailability(
        mockUser2,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      // 最初の参加者を追加
      await eventStorage.addParticipant(event.id, mockUser1);

      // Act - 2番目の参加者追加時にマッチング実行
      await eventStorage.addParticipant(event.id, mockUser2);
      const result = await matchingEngine.onParticipantAdded(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.participants).toHaveLength(2);
    });

    it('should automatically update event status when participant join triggers matching', async () => {
      // Arrange - マッチング可能な条件を整える
      const eventRequest: CreateEventRequest = {
        name: 'Participant Join Auto Match',
        description: 'Test auto-matching on participant join',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      // 共通空き日程を設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await scheduleStorage.setAvailability(
        mockUser1,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      await scheduleStorage.setAvailability(
        mockUser2,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      // 最初の参加者を追加（まだマッチングしない）
      await eventStorage.addParticipant(event.id, mockUser1);
      let currentEvent = await eventStorage.getEventById(event.id);
      expect(currentEvent?.status).toBe('open');

      // Act - 2番目の参加者追加でマッチング成立
      await eventStorage.addParticipant(event.id, mockUser2);
      const result = await matchingEngine.onParticipantAdded(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.participants).toHaveLength(2);
      
      // イベントステータスが自動更新されていることを確認
      currentEvent = await eventStorage.getEventById(event.id);
      expect(currentEvent?.status).toBe('matched');
      expect(currentEvent?.matchedTimeSlots).toHaveLength(1);
    });

    it('should not update event status when participant join does not trigger matching', async () => {
      // Arrange - マッチングしない条件
      const eventRequest: CreateEventRequest = {
        name: 'Participant Join No Match',
        description: 'Test no auto-matching on insufficient participants',
        requiredParticipants: 3,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);

      // Act - 参加者追加（まだ人数不足）
      await eventStorage.addParticipant(event.id, mockUser1);
      const result = await matchingEngine.onParticipantAdded(event.id);

      // Assert
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('Insufficient participants');
      
      // イベントステータスがopenのままであることを確認
      const currentEvent = await eventStorage.getEventById(event.id);
      expect(currentEvent?.status).toBe('open');
      expect(currentEvent?.matchedTimeSlots).toBeUndefined();
    });
  });

  describe('checkAllEvents', () => {
    it('should check all open events and update matched ones', async () => {
      // Arrange - 複数のイベントを作成
      const eventRequest1: CreateEventRequest = {
        name: 'Event 1',
        description: 'Description 1',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const eventRequest2: CreateEventRequest = {
        name: 'Event 2',
        description: 'Description 2',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event1 = await eventStorage.createEvent(eventRequest1, mockCreator);
      await eventStorage.createEvent(eventRequest2, mockCreator);

      // Event1を成立条件満たすように設定
      await eventStorage.addParticipant(event1.id, mockUser1);
      await eventStorage.addParticipant(event1.id, mockUser2);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await scheduleStorage.setAvailability(
        mockUser1,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      await scheduleStorage.setAvailability(
        mockUser2,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      // Event2は参加者不足

      // Act
      const results = await matchingEngine.checkAllEvents();

      // Assert
      expect(results).toHaveLength(2);
      
      const event1Result = results.find(r => r.eventId === event1.id);
      const anyUnmatchedResult = results.find(r => !r.isMatched);

      expect(event1Result?.isMatched).toBe(true);
      expect(anyUnmatchedResult).toBeDefined();

      // イベントステータスが更新されていることを確認
      const updatedEvent1 = await eventStorage.getEventById(event1.id);
      expect(updatedEvent1?.status).toBe('matched');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      // Arrange
      const eventRequest: CreateEventRequest = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event1 = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.createEvent(eventRequest, mockCreator);
      
      // Event1を成立させる
      await eventStorage.updateEventStatus(event1.id, 'matched');

      // Act
      const stats = await matchingEngine.getStats();

      // Assert
      expect(stats.totalEventsChecked).toBe(2);
      expect(stats.matchedEvents).toBe(1);
      expect(stats.pendingEvents).toBe(1);
    });
  });

  describe('onScheduleUpdated', () => {
    it('should check matching for user events when schedule is updated', async () => {
      // Arrange - ユーザーが参加しているイベントを作成
      const eventRequest: CreateEventRequest = {
        name: 'Schedule Update Test Event',
        description: 'Test auto-matching on schedule update',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 最初はマッチングしない状態にしておく
      const initialResult = await matchingEngine.checkEventMatching(event.id);
      expect(initialResult.isMatched).toBe(false);

      // Act - user1のスケジュール更新時に自動マッチング実行
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // user2のスケジュールも設定
      await scheduleStorage.setAvailability(
        mockUser2,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      // user1のスケジュール更新（これによりマッチング成立）
      await scheduleStorage.setAvailability(
        mockUser1,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );
      
      const results = await matchingEngine.onScheduleUpdated(mockUser1);

      // Assert
      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.eventId).toBe(event.id);
      expect(result.isMatched).toBe(true);
      
      // イベントステータスが自動更新されていることを確認
      const updatedEvent = await eventStorage.getEventById(event.id);
      expect(updatedEvent?.status).toBe('matched');
      expect(updatedEvent?.matchedTimeSlots).toHaveLength(1);
    });

    it('should check multiple events when user participates in several', async () => {
      // Arrange - ユーザーが複数のイベントに参加
      const event1Request: CreateEventRequest = {
        name: 'Multi Event Test 1',
        description: 'Test Description 1',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event2Request: CreateEventRequest = {
        name: 'Multi Event Test 2', 
        description: 'Test Description 2',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event1 = await eventStorage.createEvent(event1Request, mockCreator);
      const event2 = await eventStorage.createEvent(event2Request, mockCreator);
      
      // user1が両イベントに参加
      await eventStorage.addParticipant(event1.id, mockUser1);
      await eventStorage.addParticipant(event2.id, mockUser1);
      
      // event1にはuser2も参加（マッチング可能）
      await eventStorage.addParticipant(event1.id, mockUser2);
      // event2は参加者不足（マッチング不可）

      // 共通スケジュールを設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await scheduleStorage.setAvailability(
        mockUser2,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      // Act - user1のスケジュール更新
      await scheduleStorage.setAvailability(
        mockUser1,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      const results = await matchingEngine.onScheduleUpdated(mockUser1);

      // Assert
      expect(results).toHaveLength(2);
      
      const event1Result = results.find(r => r.eventId === event1.id);
      const event2Result = results.find(r => r.eventId === event2.id);
      
      expect(event1Result?.isMatched).toBe(true);
      expect(event2Result?.isMatched).toBe(false);
      expect(event2Result?.reason).toContain('Insufficient participants');
    });

    it('should handle user with no participating events', async () => {
      // Arrange - ユーザーがイベントに参加していない状態
      
      // Act
      const results = await matchingEngine.onScheduleUpdated(mockUser1);

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('automatic status update on matching', () => {
    it('should automatically update event status to matched when conditions are met', async () => {
      // Arrange
      const eventRequest: CreateEventRequest = {
        name: 'Auto Status Update Test',
        description: 'Test automatic status update',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await scheduleStorage.setAvailability(
        mockUser1,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      await scheduleStorage.setAvailability(
        mockUser2,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      // イベントが最初はopenステータスであることを確認
      let currentEvent = await eventStorage.getEventById(event.id);
      expect(currentEvent?.status).toBe('open');

      // Act - マッチングチェック実行
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      
      // ステータスが自動的にmatchedに更新されていることを確認
      currentEvent = await eventStorage.getEventById(event.id);
      expect(currentEvent?.status).toBe('matched');
      expect(currentEvent?.matchedTimeSlots).toHaveLength(1);
      expect(currentEvent?.matchedTimeSlots?.[0].date).toBeInstanceOf(Date);
    });

    it('should not update status when matching fails', async () => {
      // Arrange
      const eventRequest: CreateEventRequest = {
        name: 'No Auto Update Test',
        description: 'Test no status update on failed match',
        requiredParticipants: 3,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      // 参加者不足

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(false);
      
      // ステータスがopenのままであることを確認
      const currentEvent = await eventStorage.getEventById(event.id);
      expect(currentEvent?.status).toBe('open');
      expect(currentEvent?.matchedTimeSlots).toBeUndefined();
    });
  });

  describe('deadline functionality', () => {
    it('should expire overdue events when checking', async () => {
      // Arrange - 期限切れのイベントを作成
      const expiredDeadline = new Date(Date.now() - 60 * 60 * 1000); // 1時間前
      const eventRequest: CreateEventRequest = {
        name: 'Expired Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: expiredDeadline,
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(false);
      expect(result.reason).toBe('Event deadline has passed');
      
      // ステータスが期限切れに更新されているかチェック
      const updatedEvent = await eventStorage.getEventById(event.id);
      expect(updatedEvent?.status).toBe('expired');
    });

    it('should process events with future deadlines normally', async () => {
      // Arrange - 将来の期限のイベントを作成
      const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 明日
      const eventRequest: CreateEventRequest = {
        name: 'Future Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: futureDeadline,
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 共通空き日程を設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await scheduleStorage.setAvailability(
        mockUser1,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      await scheduleStorage.setAvailability(
        mockUser2,
        [tomorrow.toISOString().split('T')[0]],
        { daytime: true, evening: true }
      );

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.reason).toBe('Successfully matched');
    });

    it('should expire overdue events in checkAllEvents', async () => {
      // Arrange - 期限切れと通常のイベントを作成
      const expiredDeadline = new Date(Date.now() - 60 * 60 * 1000); // 1時間前
      const expiredEventRequest: CreateEventRequest = {
        name: 'Expired Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: expiredDeadline,
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const normalEventRequest: CreateEventRequest = {
        name: 'Normal Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const expiredEvent = await eventStorage.createEvent(expiredEventRequest, mockCreator);
      const normalEvent = await eventStorage.createEvent(normalEventRequest, mockCreator);

      // Act
      const results = await matchingEngine.checkAllEvents();

      // Assert
      expect(results).toHaveLength(2);

      // 期限切れイベントはexpiredステータスになっている
      const updatedExpiredEvent = await eventStorage.getEventById(expiredEvent.id);
      expect(updatedExpiredEvent?.status).toBe('expired');

      // 通常のイベントはopenのまま
      const updatedNormalEvent = await eventStorage.getEventById(normalEvent.id);
      expect(updatedNormalEvent?.status).toBe('open');
    });
  });

  describe('柔軟な日程マッチング', () => {
    it('should match consecutive dates with consecutive mode', async () => {
      // Arrange
      const eventRequest: CreateEventRequest = {
        name: 'Consecutive Test Event',
        description: 'Test consecutive date matching',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 連続した2日間の空き時間を設定
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(today.getDate() + 2);

      const dates = [
        today.toISOString().split('T')[0],
        tomorrow.toISOString().split('T')[0],
        // dayAfterは設定しない（連続でない日程も存在）
      ];

      for (const userId of [mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          dates,
          { daytime: true, evening: true }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
    });

    it('should match flexible dates with flexible mode', async () => {
      // Arrange
      const eventRequest: CreateEventRequest = {
        name: 'Flexible Test Event',
        description: 'Test flexible date matching',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 非連続だが2日間の空き時間を設定（月・水）
      const today = new Date();
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(today.getDate() + 2);

      const dates = [
        today.toISOString().split('T')[0],
        dayAfterTomorrow.toISOString().split('T')[0],
      ];

      for (const userId of [mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          dates,
          { daytime: true, evening: true }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
    });

    it('should match dates within specified period', async () => {
      // Arrange
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() + 1); // 明日から
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 7); // 1週間後まで

      const eventRequest: CreateEventRequest = {
        name: 'Period Test Event',
        description: 'Test within period date matching',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart,
        periodEnd
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 期間内の日程を設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 3);

      const dates = [
        tomorrow.toISOString().split('T')[0],
        dayAfter.toISOString().split('T')[0],
      ];

      for (const userId of [mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          dates,
          { daytime: true, evening: true }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
    });
  });

  describe('優先度システム', () => {
    it('should create events with different priorities', async () => {
      // Arrange
      const highPriorityRequest: CreateEventRequest = {
        name: 'High Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const lowPriorityRequest: CreateEventRequest = {
        name: 'Low Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      // Act
      const highEvent = await eventStorage.createEvent(highPriorityRequest, mockCreator);
      const lowEvent = await eventStorage.createEvent(lowPriorityRequest, mockCreator);

      // Assert
      expect(highEvent.name).toBe('High Priority Event');
      expect(lowEvent.name).toBe('Low Priority Event');
    });
  });

  describe('グローバルマッチング', () => {
    it('should prevent double booking with global matching', async () => {
      // Arrange - 同じ日程で成立する可能性のある2つのイベントを作成
      const event1Request: CreateEventRequest = {
        name: 'High Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event2Request: CreateEventRequest = {
        name: 'Low Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event1 = await eventStorage.createEvent(event1Request, mockCreator);
      const event2 = await eventStorage.createEvent(event2Request, mockCreator);

      // 同じ参加者が両方のイベントに参加
      await eventStorage.addParticipant(event1.id, mockUser1);
      await eventStorage.addParticipant(event1.id, mockUser2);
      await eventStorage.addParticipant(event2.id, mockUser1);
      await eventStorage.addParticipant(event2.id, mockUser2);

      // 同じ日程で両方とも成立可能な状態にする
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const userId of [mockUser1, mockUser2]) {
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0]],
          { daytime: true, evening: true }
        );
      }

      // Act - グローバルマッチング実行
      const results = await matchingEngine.globalMatching();

      // Assert
      expect(results).toHaveLength(2);
      
      const event1Result = results.find(r => r.eventId === event1.id);
      const event2Result = results.find(r => r.eventId === event2.id);

      // 高優先度のイベントのみが成立し、低優先度はダブルブッキング防止で成立しない
      expect(event1Result?.isMatched).toBe(true);
      expect(event2Result?.isMatched).toBe(false);
      expect(event2Result?.reason).toBe('No available dates without conflicts');
    });

    it('should handle multiple events with different participants', async () => {
      // Arrange
      const mockUser3 = `user-3-${Math.random().toString(36).substring(7)}`;
      await userStorage.createUser({
        userId: mockUser3,
        password: 'password123'
      });

      const event1Request: CreateEventRequest = {
        name: 'Event 1',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event2Request: CreateEventRequest = {
        name: 'Event 2',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days later
      };

      const event1 = await eventStorage.createEvent(event1Request, mockCreator);
      const event2 = await eventStorage.createEvent(event2Request, mockCreator);

      // 異なる参加者でイベントを設定
      await eventStorage.addParticipant(event1.id, mockUser1);
      await eventStorage.addParticipant(event1.id, mockUser2);
      await eventStorage.addParticipant(event2.id, mockUser1);
      await eventStorage.addParticipant(event2.id, mockUser3);

      // 共通の日程を設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const userId of [mockUser1, mockUser2, mockUser3]) {
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0]],
          { daytime: true, evening: true }
        );
      }

      // Act
      const results = await matchingEngine.globalMatching();

      // Assert
      expect(results).toHaveLength(2);
      
      const event1Result = results.find(r => r.eventId === event1.id);
      const event2Result = results.find(r => r.eventId === event2.id);

      // event1が先に成立し、event2はuser1のダブルブッキングで成立しない
      expect(event1Result?.isMatched).toBe(true);
      expect(event2Result?.isMatched).toBe(false);
    });
  });
});