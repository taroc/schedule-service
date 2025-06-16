import { describe, it, expect } from 'vitest';
import { 
  isUserAvailableOnDate, 
  areAllUsersAvailableOnDate,
  getUserAvailableDatesInRange,
  getCommonAvailableDates 
} from '../scheduleUtils';
import { UserSchedule } from '../../types/schedule';

describe('scheduleUtils', () => {
  const testDate1 = new Date('2024-01-01T00:00:00Z');
  const testDate2 = new Date('2024-01-02T00:00:00Z');
  const testDate3 = new Date('2024-01-03T00:00:00Z');
  
  const mockSchedules: UserSchedule[] = [
    {
      id: '1',
      userId: 'user1',
      date: testDate1,
      timeSlots: { morning: true, afternoon: false, fullday: false },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2', 
      userId: 'user1',
      date: testDate2,
      timeSlots: { morning: false, afternoon: false, fullday: false },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      userId: 'user2', 
      date: testDate1,
      timeSlots: { morning: false, afternoon: true, fullday: false },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  describe('isUserAvailableOnDate', () => {
    it('should return true for date with any available time slot', () => {
      expect(isUserAvailableOnDate(mockSchedules, 'user1', testDate1)).toBe(true); // morning slot available
      expect(isUserAvailableOnDate(mockSchedules, 'user2', testDate1)).toBe(true); // afternoon slot available
    });

    it('should return false for date with no available time slots', () => {
      expect(isUserAvailableOnDate(mockSchedules, 'user1', testDate2)).toBe(false);
    });

    it('should return false for unregistered date (default busy)', () => {
      expect(isUserAvailableOnDate(mockSchedules, 'user1', testDate3)).toBe(false);
    });

    it('should return false for unregistered user', () => {
      expect(isUserAvailableOnDate(mockSchedules, 'user3', testDate1)).toBe(false);
    });
  });

  describe('areAllUsersAvailableOnDate', () => {
    it('should return true when all users have any available time slot', () => {
      expect(areAllUsersAvailableOnDate(mockSchedules, ['user1', 'user2'], testDate1)).toBe(true);
    });

    it('should return false when any user has no available time slots', () => {
      expect(areAllUsersAvailableOnDate(mockSchedules, ['user1', 'user2'], testDate2)).toBe(false);
    });

    it('should return false when any user has no schedule (default busy)', () => {
      expect(areAllUsersAvailableOnDate(mockSchedules, ['user1', 'user2'], testDate3)).toBe(false);
    });
  });

  describe('getUserAvailableDatesInRange', () => {
    it('should return only dates with available time slots for user', () => {
      const availableDates = getUserAvailableDatesInRange(
        mockSchedules, 
        'user1', 
        testDate1, 
        testDate3
      );
      
      expect(availableDates).toHaveLength(1);
      expect(availableDates[0].toDateString()).toBe(testDate1.toDateString());
    });

    it('should return empty array for user with no available dates', () => {
      const availableDates = getUserAvailableDatesInRange(
        mockSchedules, 
        'user3', 
        testDate1, 
        testDate3
      );
      
      expect(availableDates).toHaveLength(0);
    });
  });

  describe('getCommonAvailableDates', () => {
    it('should return common available dates when all users have any time slot available', () => {
      const commonDates = getCommonAvailableDates(
        mockSchedules,
        ['user1', 'user2'],
        testDate1,
        testDate3,
        1
      );
      
      expect(commonDates).toHaveLength(1);
      expect(commonDates[0].toDateString()).toBe(testDate1.toDateString());
    });

    it('should return empty array when no common dates available', () => {
      const commonDates = getCommonAvailableDates(
        mockSchedules,
        ['user1', 'user2'],
        testDate2,
        testDate3,
        1
      );
      
      expect(commonDates).toHaveLength(0);
    });

    it('should handle consecutive dates requirement', () => {
      // Add consecutive available dates for both users
      const extendedSchedules: UserSchedule[] = [
        ...mockSchedules.filter(s => s.date.toDateString() !== testDate2.toDateString()), // Remove the unavailable date2
        {
          id: '4',
          userId: 'user1',
          date: testDate2, // Make testDate2 available for user1
          timeSlots: { morning: true, afternoon: false, fullday: false },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '5',
          userId: 'user2',
          date: testDate2, // Make testDate2 available for user2
          timeSlots: { morning: false, afternoon: true, fullday: false },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const commonDates = getCommonAvailableDates(
        extendedSchedules,
        ['user1', 'user2'],
        testDate1,
        testDate3,
        2 // require 2 consecutive days
      );
      
      expect(commonDates).toHaveLength(2); // testDate1 and testDate2 are consecutive
      expect(commonDates[0].toDateString()).toBe(testDate1.toDateString());
      expect(commonDates[1].toDateString()).toBe(testDate2.toDateString());
    });
  });
});