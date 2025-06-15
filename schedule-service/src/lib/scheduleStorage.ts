import { 
  UserSchedule, 
  BulkAvailabilityRequest
} from '@/types/schedule';

class ScheduleStorage {
  private schedules: UserSchedule[] = [];

  // 新しいフロー：選択した日付に空き時間を登録
  async bulkSetAvailability(request: BulkAvailabilityRequest, userId: string): Promise<UserSchedule[]> {
    const processedSchedules: UserSchedule[] = [];

    for (const dateString of request.dates) {
      const date = new Date(dateString);
      
      // 既存の予定を検索
      const existingScheduleIndex = this.schedules.findIndex(
        s => s.userId === userId && 
             s.date.toDateString() === date.toDateString()
      );
      
      if (existingScheduleIndex !== -1) {
        // 既存の予定を更新
        const existingSchedule = this.schedules[existingScheduleIndex];
        
        // 指定された時間帯を空きに設定
        existingSchedule.timeSlots = {
          morning: request.timeSlots.morning || existingSchedule.timeSlots.morning,
          afternoon: request.timeSlots.afternoon || existingSchedule.timeSlots.afternoon,
          fullday: request.timeSlots.fullday || existingSchedule.timeSlots.fullday,
        };
          
        existingSchedule.updatedAt = new Date();
        processedSchedules.push(existingSchedule);
      } else {
        // 新しい予定を作成
        const schedule: UserSchedule = {
          id: Math.random().toString(36).substring(2, 15),
          userId,
          date,
          timeSlots: { ...request.timeSlots },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        this.schedules.push(schedule);
        processedSchedules.push(schedule);
      }
    }

    return processedSchedules;
  }

  // ユーザーのすべての予定を取得
  async getUserSchedules(userId: string): Promise<UserSchedule[]> {
    return this.schedules.filter(s => s.userId === userId);
  }

  // 日付範囲でユーザーの予定を取得
  async getUserSchedulesByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<UserSchedule[]> {
    return this.schedules.filter(s => 
      s.userId === userId && 
      s.date >= startDate && 
      s.date <= endDate
    );
  }

  // 指定した日付でユーザーの予定を取得
  async getScheduleByUserAndDate(userId: string, date: Date): Promise<UserSchedule | null> {
    // 指定したユーザーと日付の予定を取得
    // nullが返される場合は未登録（デフォルトで忙しい扱い）
    return this.schedules.find(
      s => s.userId === userId && 
           s.date.toDateString() === date.toDateString()
    ) || null;
  }

  // 指定した日付範囲でユーザーが空いている日程を取得
  async getUserAvailableDates(userId: string, startDate: Date, endDate: Date): Promise<Date[]> {
    const availableSchedules = this.schedules.filter(s => 
      s.userId === userId && 
      (s.timeSlots.morning || s.timeSlots.afternoon || s.timeSlots.fullday) &&
      s.date >= startDate && 
      s.date <= endDate
    );
    
    return availableSchedules.map(s => s.date);
  }

  // 複数ユーザーの共通空き日程を取得（マッチングエンジン用）
  async getCommonAvailableDates(
    userIds: string[], 
    startDate: Date, 
    endDate: Date,
    requiredDays: number
  ): Promise<Date[]> {
    const commonDates: Date[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      
      // 全ユーザーがこの日に空いているかチェック
      // 未登録の場合（schedule === null）は忙しい扱いになる
      const allAvailable = await Promise.all(
        userIds.map(async userId => {
          const schedule = await this.getScheduleByUserAndDate(userId, currentDate);
          // 時間帯のいずれかが空いていればtrue
          return schedule && (schedule.timeSlots.morning || schedule.timeSlots.afternoon || schedule.timeSlots.fullday);
        })
      );
      
      if (allAvailable.every(available => available)) {
        commonDates.push(currentDate);
      }
    }
    
    // 連続した日程を見つける
    return this.findConsecutiveDates(commonDates, requiredDays);
  }

  private findConsecutiveDates(dates: Date[], requiredDays: number): Date[] {
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
}

export const scheduleStorage = new ScheduleStorage();