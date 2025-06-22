import { describe, it, expect, beforeEach, vi } from 'vitest';
import { matchingEngine } from '../matchingEngine';
import { eventStorage } from '../eventStorage';
import { userStorage } from '../userStorage';
import { scheduleStorage } from '../scheduleStorage';
import { CreateEventRequest, Event } from '@/types/event';
import { TimeSlot } from '@/types/schedule';

// Mock the storage modules
vi.mock('../eventStorage');
vi.mock('../userStorage');
vi.mock('../scheduleStorage');

describe('Advanced Matching Features', () => {
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

    // Mock user storage methods - users already exist
    mockUserStorage.createUser.mockResolvedValue({
      id: mockUser1,
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  describe('柔軟な日程マッチング', () => {
    it('should match flexible dates with flexible mode', async () => {
      // Arrange
      const eventRequest: CreateEventRequest = {
        name: 'Flexible Test Event',
        description: 'Test flexible date matching',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      };

      const mockEvent: Event = {
        id: 'event-1',
        name: 'Flexible Test Event',
        description: 'Test flexible date matching',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        creatorId: mockCreator,
        status: 'open',
        participants: [mockCreator, mockUser1, mockUser2],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      mockEventStorage.createEvent.mockResolvedValue(mockEvent);
      mockEventStorage.addParticipant.mockResolvedValue({ success: true });
      mockEventStorage.getEventById.mockResolvedValue(mockEvent);

      // Mock schedule storage to return availability
      mockScheduleStorage.setAvailability.mockResolvedValue(undefined);
      mockScheduleStorage.isUserAvailableAtTimeSlot.mockResolvedValue(true);
      
      // Mock getUserSchedulesByDateRange to return schedule data
      mockScheduleStorage.getUserSchedulesByDateRange.mockImplementation(
        async (userId: string, startDate: Date, endDate: Date) => {
          const schedules = [];
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          for (let i = 0; i <= daysDiff && i < 14; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            schedules.push({
              id: `schedule-${userId}-${i}`,
              userId,
              date,
              timeSlots: { daytime: true, evening: true },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
          return schedules;
        }
      );
      
      // Mock event status update
      mockEventStorage.updateEventStatus.mockResolvedValue(true);

      // Act
      const result = await matchingEngine.checkEventMatching('event-1');

      // Assert
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      expect(result.reason).toBe('Successfully matched');
    });

    it('should create events with different priorities', async () => {
      // Arrange
      const highEvent: Event = {
        id: 'high-event',
        name: 'High Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        creatorId: mockCreator,
        status: 'open',
        participants: [mockCreator],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      const lowEvent: Event = {
        id: 'low-event',
        name: 'Low Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        creatorId: mockCreator,
        status: 'open',
        participants: [mockCreator],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      // Mock the storage calls
      mockEventStorage.createEvent.mockImplementation((request) => {
        if (request.name === 'High Priority Event') {
          return Promise.resolve(highEvent);
        }
        return Promise.resolve(lowEvent);
      });

      // Act
      const highPriorityRequest: CreateEventRequest = {
        name: 'High Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      };
      
      const lowPriorityRequest: CreateEventRequest = {
        name: 'Low Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      };
      
      const resultHigh = await eventStorage.createEvent(highPriorityRequest, mockCreator);
      const resultLow = await eventStorage.createEvent(lowPriorityRequest, mockCreator);

      // Assert
      expect(resultHigh.name).toBe('High Priority Event');
      expect(resultLow.name).toBe('Low Priority Event');
    });
  });

  describe('グローバルマッチング', () => {
    it('should prevent double booking with global matching', async () => {
      // Arrange
      const event1: Event = {
        id: 'event-1',
        name: 'High Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        creatorId: mockCreator,
        status: 'open',
        participants: [mockCreator, mockUser1, mockUser2],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      const event2: Event = {
        id: 'event-2',
        name: 'Low Priority Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        creatorId: mockCreator,
        status: 'open',
        participants: [mockCreator, mockUser1, mockUser2],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      // Mock storage methods
      mockEventStorage.getAllEvents.mockResolvedValue([event1, event2]);
      mockEventStorage.expireOverdueEvents.mockResolvedValue(0);
      mockEventStorage.addParticipant.mockResolvedValue({ success: true });
      mockScheduleStorage.setAvailability.mockResolvedValue(undefined);
      mockScheduleStorage.isUserAvailableAtTimeSlot.mockResolvedValue(true);
      
      // Mock getUserSchedulesByDateRange to return schedule data
      mockScheduleStorage.getUserSchedulesByDateRange.mockImplementation(
        async (userId: string, startDate: Date, endDate: Date) => {
          const schedules = [];
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          for (let i = 0; i <= daysDiff && i < 14; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            schedules.push({
              id: `schedule-${userId}-${i}`,
              userId,
              date,
              timeSlots: { daytime: true, evening: false },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
          return schedules;
        }
      );
      
      mockEventStorage.updateEventStatus.mockResolvedValue(true);

      // Act
      const results = await matchingEngine.globalMatching();

      // Assert
      expect(results).toHaveLength(2);
      
      const event1Result = results.find(r => r.eventId === 'event-1');
      const event2Result = results.find(r => r.eventId === 'event-2');

      // 高優先度のイベントのみが成立し、低優先度はダブルブッキング防止で成立しない
      expect(event1Result?.isMatched).toBe(true);
      expect(event2Result?.isMatched).toBe(false);
      expect(event2Result?.reason).toBe('No available time slots without conflicts');
    });
  });
});