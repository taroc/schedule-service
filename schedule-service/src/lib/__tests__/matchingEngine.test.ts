import { describe, it, expect, beforeEach } from 'vitest';
import { matchingEngine } from '../matchingEngine';
import { eventStorageDB as eventStorage } from '../eventStorage';
import { userStorageDB as userStorage } from '../userStorage';
import { scheduleStorage } from '../scheduleStorage';
import { CreateEventRequest } from '@/types/event';

describe('matchingEngine', () => {
  const mockUser1 = 'user-1';
  const mockUser2 = 'user-2';
  const mockCreator = 'creator-1';

  beforeEach(async () => {
    // テスト前にテストユーザーを作成
    await userStorage.createUser({
      userId: 'user-1',
      password: 'password123'
    }, mockUser1);
    
    await userStorage.createUser({
      userId: 'user-2',
      password: 'password123'
    }, mockUser2);
    
    await userStorage.createUser({
      userId: 'creator-1',
      password: 'password123'
    }, mockCreator);
  });

  describe('checkEventMatching', () => {
    it('should return false for insufficient participants', async () => {
      // Arrange - 必要人数に満たないイベントを作成
      const eventRequest: CreateEventRequest = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 3,
        requiredDays: 2
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      // 参加者が1人のみ（必要人数3人に満たない）

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('Insufficient participants');
      expect(result.participants).toHaveLength(1);
    });

    it('should return false when no common available dates', async () => {
      // Arrange - 十分な参加者がいるが共通空き日程がないイベント
      const eventRequest: CreateEventRequest = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredDays: 2
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 異なる日に空き時間を設定（共通日程なし）
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      await scheduleStorage.bulkSetAvailability({
        dates: [tomorrow.toISOString()],
        timeSlots: { morning: true, afternoon: false, fullday: false }
      }, mockUser1);

      await scheduleStorage.bulkSetAvailability({
        dates: [dayAfterTomorrow.toISOString()],
        timeSlots: { morning: true, afternoon: false, fullday: false }
      }, mockUser2);

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('No common available dates');
    });

    it('should return true when requirements are met', async () => {
      // Arrange - 十分な参加者と共通空き日程があるイベント
      const eventRequest: CreateEventRequest = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredDays: 2
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 共通の連続空き日程を設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      const dates = [tomorrow.toISOString(), dayAfterTomorrow.toISOString()];

      await scheduleStorage.bulkSetAvailability({
        dates,
        timeSlots: { morning: true, afternoon: false, fullday: false }
      }, mockUser1);

      await scheduleStorage.bulkSetAvailability({
        dates,
        timeSlots: { morning: false, afternoon: true, fullday: false }
      }, mockUser2);

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedDates).toHaveLength(2);
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
        requiredDays: 1
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      // 共通空き日程を設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await scheduleStorage.bulkSetAvailability({
        dates: [tomorrow.toISOString()],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      }, mockUser1);

      await scheduleStorage.bulkSetAvailability({
        dates: [tomorrow.toISOString()],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      }, mockUser2);

      // 最初の参加者を追加
      await eventStorage.addParticipant(event.id, mockUser1);

      // Act - 2番目の参加者追加時にマッチング実行
      await eventStorage.addParticipant(event.id, mockUser2);
      const result = await matchingEngine.onParticipantAdded(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.participants).toHaveLength(2);
    });
  });

  describe('checkAllEvents', () => {
    it('should check all open events and update matched ones', async () => {
      // Arrange - 複数のイベントを作成
      const eventRequest1: CreateEventRequest = {
        name: 'Event 1',
        description: 'Description 1',
        requiredParticipants: 2,
        requiredDays: 1
      };

      const eventRequest2: CreateEventRequest = {
        name: 'Event 2',
        description: 'Description 2',
        requiredParticipants: 2,
        requiredDays: 1
      };

      const event1 = await eventStorage.createEvent(eventRequest1, mockCreator);
      await eventStorage.createEvent(eventRequest2, mockCreator);

      // Event1を成立条件満たすように設定
      await eventStorage.addParticipant(event1.id, mockUser1);
      await eventStorage.addParticipant(event1.id, mockUser2);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await scheduleStorage.bulkSetAvailability({
        dates: [tomorrow.toISOString()],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      }, mockUser1);

      await scheduleStorage.bulkSetAvailability({
        dates: [tomorrow.toISOString()],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      }, mockUser2);

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
        requiredDays: 1
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
});