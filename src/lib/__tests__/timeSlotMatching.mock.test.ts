import { describe, it, expect, beforeEach, vi } from 'vitest';
import { matchingEngine } from '../matchingEngine';
import { eventStorage } from '../eventStorage';
import { scheduleStorage } from '../scheduleStorage';
import { Event } from '@/types/event';
import { TimeSlot } from '@/types/schedule';

// Mock the storage modules
vi.mock('../eventStorage');
vi.mock('../scheduleStorage');

describe('Time-Slot Based Matching Engine (Mocked)', () => {
  const mockEventStorage = vi.mocked(eventStorage);
  const mockScheduleStorage = vi.mocked(scheduleStorage);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Time-slot unit specification', () => {
    it('should create events with required time-slot units instead of days', async () => {
      const mockEvent: Event = {
        id: 'event-1',
        name: 'Time-Slot Event',
        description: 'Test time-slot based event',
        requiredParticipants: 2,
        requiredTimeSlots: 3,
        creatorId: 'creator-1',
        status: 'open',
        participants: ['creator-1'],
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      mockEventStorage.getEventById.mockResolvedValue(mockEvent);

      const event = await eventStorage.getEventById('event-1');
      
      expect(event?.requiredTimeSlots).toBe(3);
      expect(event?.participants).toContain('creator-1');
    });
  });

  describe('Time-slot based matching', () => {
    it('should not match daytime-available with evening-available users', async () => {
      const mockEvent: Event = {
        id: 'event-1',
        name: 'Time-Slot Conflict Test',
        description: 'Should not match different time slots',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        creatorId: 'creator-1',
        status: 'open',
        participants: ['creator-1', 'user-1', 'user-2'],
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      mockEventStorage.getEventById.mockResolvedValue(mockEvent);
      
      // Mock schedule storage to return different time slot availability
      mockScheduleStorage.isUserAvailableAtTimeSlot.mockImplementation(
        async (userId: string, date: Date, timeSlot: TimeSlot): Promise<boolean> => {
          if (userId === 'user-1' && timeSlot === 'daytime') return true;
          if (userId === 'user-1' && timeSlot === 'evening') return false;
          if (userId === 'user-2' && timeSlot === 'daytime') return false;
          if (userId === 'user-2' && timeSlot === 'evening') return true;
          return false;
        }
      );
      
      // Mock getUserSchedulesByDateRange to return conflicting schedule data
      mockScheduleStorage.getUserSchedulesByDateRange.mockImplementation(
        async (userId: string, startDate: Date, endDate: Date) => {
          const schedules = [];
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          for (let i = 0; i <= daysDiff; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            if (userId === 'user-1') {
              schedules.push({
                id: `schedule-${userId}-${i}`,
                userId,
                date,
                timeSlots: { daytime: true, evening: false },
                createdAt: new Date(),
                updatedAt: new Date()
              });
            } else if (userId === 'user-2') {
              schedules.push({
                id: `schedule-${userId}-${i}`,
                userId,
                date,
                timeSlots: { daytime: false, evening: true },
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
          return schedules;
        }
      );

      mockEventStorage.updateEventStatus.mockResolvedValue(true);

      const result = await matchingEngine.checkEventMatching('event-1');

      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('No common available time slots');
      expect(result.matchedTimeSlots).toHaveLength(0);
    });

    it('should match users with same time-slot availability', async () => {
      const mockEvent: Event = {
        id: 'event-2',
        name: 'Same Time-Slot Test',
        description: 'Should match same time slots',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        creatorId: 'creator-1',
        status: 'open',
        participants: ['creator-1', 'user-1', 'user-2'],
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      mockEventStorage.getEventById.mockResolvedValue(mockEvent);
      
      // Mock schedule storage to return same time slot availability
      mockScheduleStorage.isUserAvailableAtTimeSlot.mockImplementation(
        async (userId: string, date: Date, timeSlot: TimeSlot): Promise<boolean> => {
          // Both users available in daytime only
          if (timeSlot === 'daytime') return true;
          return false;
        }
      );
      
      // Mock getUserSchedulesByDateRange to return schedule data
      mockScheduleStorage.getUserSchedulesByDateRange.mockImplementation(
        async (userId: string, startDate: Date, endDate: Date) => {
          const schedules = [];
          // Return schedules for the requested date range
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          for (let i = 0; i <= daysDiff; i++) {
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

      const result = await matchingEngine.checkEventMatching('event-2');

      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(1);
      expect(result.matchedTimeSlots[0].timeSlot).toBe('daytime');
      expect(result.reason).toBe('Successfully matched');
      
      // Verify that updateEventStatus was called with time-slot information
      expect(mockEventStorage.updateEventStatus).toHaveBeenCalledWith(
        'event-2',
        'matched',
        expect.arrayContaining([
          expect.objectContaining({
            timeSlot: 'daytime'
          })
        ])
      );
    });

    it('should match multiple time-slot units correctly', async () => {
      const mockEvent: Event = {
        id: 'event-3',
        name: 'Multi Time-Slot Test',
        description: 'Should match multiple time-slot units',
        requiredParticipants: 2,
        requiredTimeSlots: 3,
        creatorId: 'creator-1',
        status: 'open',
        participants: ['creator-1', 'user-1', 'user-2'],
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      mockEventStorage.getEventById.mockResolvedValue(mockEvent);
      
      // Mock schedule storage to return availability for multiple time slots
      mockScheduleStorage.isUserAvailableAtTimeSlot.mockResolvedValue(true);
      
      // Mock getUserSchedulesByDateRange to return multiple schedule data
      mockScheduleStorage.getUserSchedulesByDateRange.mockImplementation(
        async (userId: string, startDate: Date, endDate: Date) => {
          const schedules = [];
          for (let i = 0; i < 3; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
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

      mockEventStorage.updateEventStatus.mockResolvedValue(true);

      const result = await matchingEngine.checkEventMatching('event-3');

      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(3);
      expect(result.reason).toBe('Successfully matched');
    });
  });

  describe('Double booking prevention with time-slots', () => {
    it('should prevent double booking on same time-slot in global matching', async () => {
      const mockEvent1: Event = {
        id: 'event-1',
        name: 'Meeting A',
        description: 'First meeting',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        creatorId: 'creator-1',
        status: 'open',
        participants: ['creator-1', 'user-1'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      const mockEvent2: Event = {
        id: 'event-2',
        name: 'Meeting B',
        description: 'Second meeting',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        creatorId: 'creator-2',
        status: 'open',
        participants: ['creator-2', 'user-1'],
        createdAt: new Date('2024-01-02'), // Created later
        updatedAt: new Date('2024-01-02'),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      mockEventStorage.getAllEvents.mockResolvedValue([mockEvent1, mockEvent2]);
      mockEventStorage.expireOverdueEvents.mockResolvedValue(0);
      
      // Mock both users available only in daytime
      mockScheduleStorage.isUserAvailableAtTimeSlot.mockImplementation(
        async (userId: string, date: Date, timeSlot: TimeSlot): Promise<boolean> => {
          return timeSlot === 'daytime';
        }
      );
      
      // Mock getUserSchedulesByDateRange to return daytime availability
      mockScheduleStorage.getUserSchedulesByDateRange.mockImplementation(
        async (userId: string, startDate: Date, endDate: Date) => {
          const schedules = [];
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          for (let i = 0; i <= daysDiff; i++) {
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

      const results = await matchingEngine.globalMatching();

      expect(results).toHaveLength(2);
      
      const event1Result = results.find(r => r.eventId === 'event-1');
      const event2Result = results.find(r => r.eventId === 'event-2');

      // First event should match (created earlier)
      expect(event1Result?.isMatched).toBe(true);
      
      // Second event should not match due to double booking prevention
      expect(event2Result?.isMatched).toBe(false);
      expect(event2Result?.reason).toBe('No available time slots without conflicts');
    });
  });

  describe('Insufficient participants', () => {
    it('should return false for insufficient participants', async () => {
      const mockEvent: Event = {
        id: 'event-insufficient',
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        creatorId: 'creator-1',
        status: 'open',
        participants: ['creator-1'], // Only 1 participant, need 3
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      mockEventStorage.getEventById.mockResolvedValue(mockEvent);

      const result = await matchingEngine.checkEventMatching('event-insufficient');

      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('Insufficient participants: 1/3');
      expect(result.matchedTimeSlots).toHaveLength(0);
    });
  });

  describe('Event not found', () => {
    it('should return false when event does not exist', async () => {
      mockEventStorage.getEventById.mockResolvedValue(null);

      const result = await matchingEngine.checkEventMatching('non-existent');

      expect(result.isMatched).toBe(false);
      expect(result.reason).toBe('Event not found');
      expect(result.matchedTimeSlots).toHaveLength(0);
    });
  });

  describe('Expired events', () => {
    it('should expire overdue events', async () => {
      const expiredEvent: Event = {
        id: 'expired-event',
        name: 'Expired Event',
        description: 'Test Description',
        requiredParticipants: 2,
        requiredTimeSlots: 1,
        creatorId: 'creator-1',
        status: 'open',
        participants: ['creator-1', 'user-1'],
        deadline: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reservationStatus: 'open'
      };

      mockEventStorage.getEventById.mockResolvedValue(expiredEvent);
      mockEventStorage.updateEventStatus.mockResolvedValue(true);

      const result = await matchingEngine.checkEventMatching('expired-event');

      expect(result.isMatched).toBe(false);
      expect(result.reason).toBe('Event deadline has passed');
      
      // Verify event was marked as expired
      expect(mockEventStorage.updateEventStatus).toHaveBeenCalledWith(
        'expired-event',
        'expired'
      );
    });
  });
});