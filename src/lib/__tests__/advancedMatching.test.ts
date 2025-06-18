import { describe, it, expect, beforeEach } from 'vitest';
import { matchingEngine } from '../matchingEngine';
import { eventStorage } from '../eventStorage';
import { userStorage } from '../userStorage';
import { scheduleStorage } from '../scheduleStorage';
import { CreateEventRequest } from '@/types/event';

describe('Advanced Matching Features', () => {
  let mockUser1: string;
  let mockUser2: string;
  let mockCreator: string;

  beforeEach(async () => {
    const testRunId = Math.random().toString(36).substring(7);
    mockUser1 = `user-1-${testRunId}`;
    mockUser2 = `user-2-${testRunId}`;
    mockCreator = `creator-1-${testRunId}`;

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

  describe('柔軟な日程マッチング', () => {
    it('should match flexible dates with flexible mode', async () => {
      // Arrange
      const eventRequest: CreateEventRequest = {
        name: 'Flexible Test Event',
        description: 'Test flexible date matching',
        requiredParticipants: 2,
        requiredDays: 2,
        dateMode: 'flexible'
      };

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      await eventStorage.addParticipant(event.id, mockUser1);
      await eventStorage.addParticipant(event.id, mockUser2);

      // 非連続だが2日間の空き時間を設定
      const today = new Date();
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(today.getDate() + 2);

      const dates = [
        today.toISOString().split('T')[0],
        dayAfterTomorrow.toISOString().split('T')[0],
      ];

      for (const userId of [mockUser1, mockUser2]) {
        await scheduleStorage.bulkSetAvailability({
          dates,
          timeSlots: { morning: false, afternoon: false, fullday: true }
        }, userId);
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedDates).toHaveLength(2);
    });

    it('should create events with different priorities', async () => {
      // Arrange
      const highPriorityRequest: CreateEventRequest = {
        name: 'High Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredDays: 1,
        priority: 'high'
      };

      const lowPriorityRequest: CreateEventRequest = {
        name: 'Low Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredDays: 1,
        priority: 'low'
      };

      // Act
      const highEvent = await eventStorage.createEvent(highPriorityRequest, mockCreator);
      const lowEvent = await eventStorage.createEvent(lowPriorityRequest, mockCreator);

      // Assert
      expect(highEvent.priority).toBe('high');
      expect(lowEvent.priority).toBe('low');
    });
  });

  describe('グローバルマッチング', () => {
    it('should prevent double booking with global matching', async () => {
      // Arrange
      const event1Request: CreateEventRequest = {
        name: 'High Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredDays: 1,
        priority: 'high'
      };

      const event2Request: CreateEventRequest = {
        name: 'Low Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredDays: 1,
        priority: 'low'
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
        await scheduleStorage.bulkSetAvailability({
          dates: [tomorrow.toISOString().split('T')[0]],
          timeSlots: { morning: false, afternoon: false, fullday: true }
        }, userId);
      }

      // Act
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
  });
});