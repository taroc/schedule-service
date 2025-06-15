import { UserSchedule } from '@/types/schedule';

/**
 * 指定した日付でユーザーが空いているかどうかを判定
 * 未登録の日はデフォルトで忙しい（false）とする
 */
export function isUserAvailableOnDate(
  schedules: UserSchedule[], 
  userId: string, 
  date: Date
): boolean {
  const schedule = schedules.find(s => 
    s.userId === userId && 
    s.date.toDateString() === date.toDateString()
  );
  
  // 未登録の場合はfalse（忙しい）、登録済みの場合は時間帯のいずれかが空いているかを判定
  return schedule ? (schedule.timeSlots.morning || schedule.timeSlots.afternoon || schedule.timeSlots.fullday) : false;
}

/**
 * 複数ユーザーが指定した日付に全員空いているかを判定
 * 未登録の日はデフォルトで忙しい（false）とする
 */
export function areAllUsersAvailableOnDate(
  schedules: UserSchedule[], 
  userIds: string[], 
  date: Date
): boolean {
  return userIds.every(userId => 
    isUserAvailableOnDate(schedules, userId, date)
  );
}

/**
 * 日付範囲内でユーザーが空いている日付のリストを取得
 * 未登録の日は含まれない（デフォルトで忙しい）
 */
export function getUserAvailableDatesInRange(
  schedules: UserSchedule[], 
  userId: string, 
  startDate: Date, 
  endDate: Date
): Date[] {
  const availableDates: Date[] = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    if (isUserAvailableOnDate(schedules, userId, currentDate)) {
      availableDates.push(currentDate);
    }
  }
  
  return availableDates;
}

/**
 * 複数ユーザーの共通で空いている日付を取得
 * 指定した連続日数を満たす期間を返す
 */
export function getCommonAvailableDates(
  schedules: UserSchedule[], 
  userIds: string[], 
  startDate: Date, 
  endDate: Date,
  requiredDays: number
): Date[] {
  const commonDates: Date[] = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    if (areAllUsersAvailableOnDate(schedules, userIds, currentDate)) {
      commonDates.push(currentDate);
    }
  }
  
  return findConsecutiveDates(commonDates, requiredDays);
}

/**
 * 日付配列から指定した連続日数を満たす最初の期間を返す
 */
function findConsecutiveDates(dates: Date[], requiredDays: number): Date[] {
  if (dates.length < requiredDays) return [];
  
  dates.sort((a, b) => a.getTime() - b.getTime());
  
  for (let i = 0; i <= dates.length - requiredDays; i++) {
    const consecutiveDates: Date[] = [dates[i]];
    
    for (let j = i + 1; j < dates.length; j++) {
      const prevDate = consecutiveDates[consecutiveDates.length - 1];
      const currentDate = dates[j];
      const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        consecutiveDates.push(currentDate);
        
        if (consecutiveDates.length === requiredDays) {
          return consecutiveDates;
        }
      } else {
        break;
      }
    }
  }
  
  return [];
}