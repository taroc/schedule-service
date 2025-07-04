import { expect } from 'vitest';
import { MatchingTimeSlot } from '@/types/schedule';

// カスタムマッチャーの実装
expect.extend({
  toHaveConsecutiveTimeSlots(received: MatchingTimeSlot[]) {
    if (received.length < 2) {
      return {
        message: () => `Expected at least 2 time slots for consecutive check, got ${received.length}`,
        pass: false
      };
    }

    // 日付順にソート
    const sorted = [...received].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let hasConsecutive = false;
    
    // 連続性をチェック
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      const currentDate = current.date;
      const nextDate = next.date;
      
      // 同日の昼→夜
      if (currentDate.getTime() === nextDate.getTime()) {
        if (current.timeSlot === 'daytime' && next.timeSlot === 'evening') {
          hasConsecutive = true;
          break;
        }
      }
      
      // 隣接日の連続
      const dayDiff = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
      if (dayDiff === 1) {
        hasConsecutive = true;
        break;
      }
    }

    return {
      message: () => hasConsecutive 
        ? `Expected time slots not to be consecutive`
        : `Expected time slots to have consecutive periods`,
      pass: hasConsecutive
    };
  },

  toAllowNonConsecutiveTimeSlots(received: MatchingTimeSlot[]) {
    if (received.length < 2) {
      return {
        message: () => `Expected at least 2 time slots for non-consecutive check, got ${received.length}`,
        pass: true // 1つの場合は非連続として扱う
      };
    }

    // 日付順にソート
    const sorted = [...received].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let allConsecutive = true;
    
    // 全てが連続かチェック
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      const currentDate = current.date;
      const nextDate = next.date;
      
      // 同日の昼→夜は連続
      if (currentDate.getTime() === nextDate.getTime()) {
        if (current.timeSlot === 'daytime' && next.timeSlot === 'evening') {
          continue; // 連続
        } else {
          allConsecutive = false;
          break;
        }
      }
      
      // 隣接日は連続
      const dayDiff = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
      if (dayDiff === 1) {
        continue; // 連続
      } else {
        allConsecutive = false;
        break;
      }
    }

    // 非連続が許可されている = 全てが連続でなくても良い
    const allowsNonConsecutive = !allConsecutive;

    return {
      message: () => allowsNonConsecutive 
        ? `Expected time slots to require consecutive periods only`
        : `Expected time slots to allow non-consecutive periods`,
      pass: allowsNonConsecutive
    };
  }
});

// 型定義の拡張
declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveConsecutiveTimeSlots(): T;
    toAllowNonConsecutiveTimeSlots(): T;
  }
}