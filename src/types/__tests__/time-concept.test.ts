import { describe, it, expect } from 'vitest';
import { 
  TimeSlot, 
  getTimeSlotHours, 
  TimeSlotAvailability,
  isValidTimeSlot 
} from '../schedule';

describe('🔴 Red Phase: 新しい時間概念の型定義', () => {
  describe('TimeSlot型', () => {
    it('TimeSlotは"evening"と"fullday"のみを受け入れるべき', () => {
      const validSlots: TimeSlot[] = ['evening', 'fullday'];
      
      // 型レベルでのテスト - コンパイルエラーが発生しないことを確認
      expect(validSlots).toHaveLength(2);
      expect(validSlots).toContain('evening');
      expect(validSlots).toContain('fullday');
    });

    it('不正なTimeSlot値を拒否すべき', () => {
      expect(isValidTimeSlot('evening')).toBe(true);
      expect(isValidTimeSlot('fullday')).toBe(true);
      expect(isValidTimeSlot('daytime')).toBe(false); // 削除されたスロット
      expect(isValidTimeSlot('invalid')).toBe(false);
    });
  });

  describe('時間数の取得', () => {
    it('eveningは3時間を返すべき', () => {
      expect(getTimeSlotHours('evening')).toBe(3);
    });

    it('fulldayは10時間を返すべき', () => {
      expect(getTimeSlotHours('fullday')).toBe(10);
    });
  });

  describe('TimeSlotAvailability', () => {
    it('新しいTimeSlotAvailabilityはeveningとfulldayのみを持つべき', () => {
      const availability: TimeSlotAvailability = {
        evening: true,
        fullday: false
      };

      expect(availability.evening).toBe(true);
      expect(availability.fullday).toBe(false);
      // daytimeプロパティが存在しないことを確認
      expect('daytime' in availability).toBe(false);
    });
  });
});