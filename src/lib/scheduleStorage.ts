import { UserSchedule, TimeSlot } from '@/types/schedule';
import { prisma } from './prisma';
import { UserSchedule as PrismaUserSchedule } from '@prisma/client';

class ScheduleStorage {
  async setAvailability(
    userId: string,
    dates: string[],
    timeSlots: { daytime: boolean; evening: boolean }
  ): Promise<void> {
    // 各日付に対して空き時間を設定
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      
      await prisma.userSchedule.upsert({
        where: {
          userId_date: {
            userId,
            date
          }
        },
        create: {
          id: `${userId}-${dateStr}`,
          userId,
          date,
          timeSlotsDaytime: timeSlots.daytime,
          timeSlotsEvening: timeSlots.evening
        },
        update: {
          timeSlotsDaytime: timeSlots.daytime,
          timeSlotsEvening: timeSlots.evening,
          updatedAt: new Date()
        }
      });
    }
  }

  async getUserSchedules(userId: string): Promise<UserSchedule[]> {
    const schedules = await prisma.userSchedule.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    });

    return schedules.map(schedule => this.mapPrismaToSchedule(schedule));
  }

  async getUserSchedulesByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UserSchedule[]> {
    // 日付範囲を日付のみ（時刻は00:00:00と23:59:59）に調整
    const adjustedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const adjustedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    
    const schedules = await prisma.userSchedule.findMany({
      where: {
        userId,
        date: {
          gte: adjustedStartDate,
          lte: adjustedEndDate
        }
      },
      orderBy: { date: 'asc' }
    });

    return schedules.map(schedule => this.mapPrismaToSchedule(schedule));
  }

  async getScheduleByUserAndDate(userId: string, date: Date): Promise<UserSchedule | null> {
    const schedule = await prisma.userSchedule.findUnique({
      where: {
        userId_date: {
          userId: userId,
          date: date
        }
      }
    });

    if (!schedule) {
      return null;
    }

    return this.mapPrismaToSchedule(schedule);
  }

  async getUserAvailableDates(userId: string, startDate: Date, endDate: Date): Promise<Date[]> {
    const schedules = await this.getUserSchedulesByDateRange(userId, startDate, endDate);
    
    return schedules
      .filter(s => s.timeSlots.daytime || s.timeSlots.evening)
      .map(s => s.date);
  }

  /**
   * 複数ユーザーのスケジュールを取得（マッチングエンジン用）
   */
  async getSchedulesByUserIds(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ userId: string; date: Date; daytime: boolean; evening: boolean }>> {
    const schedules = await prisma.userSchedule.findMany({
      where: {
        userId: { in: userIds },
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [
        { userId: 'asc' },
        { date: 'asc' }
      ]
    });

    return schedules.map(schedule => ({
      userId: schedule.userId,
      date: schedule.date,
      daytime: schedule.timeSlotsDaytime,
      evening: schedule.timeSlotsEvening
    }));
  }

  async getCommonAvailableDates(
    userIds: string[],
    startDate: Date,
    endDate: Date,
    requiredDays: number
  ): Promise<Date[]> {
    // 指定期間内の全スケジュールを取得
    const allSchedules = await prisma.userSchedule.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [
        { userId: 'asc' },
        { date: 'asc' }
      ]
    });
    
    // ユーザーIDごとにグループ化
    const schedulesByUser = new Map<string, PrismaUserSchedule[]>();
    for (const schedule of allSchedules) {
      if (!schedulesByUser.has(schedule.userId)) {
        schedulesByUser.set(schedule.userId, []);
      }
      schedulesByUser.get(schedule.userId)!.push(schedule);
    }

    const commonDates: Date[] = [];
    
    // 日付ごとにチェック（最大100日間に制限）
    let dayCount = 0;
    for (let d = new Date(startDate); d <= endDate && dayCount < 100; d = new Date(d.getTime() + 24 * 60 * 60 * 1000), dayCount++) {
      const currentDate = new Date(d);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // 全ユーザーがこの日に空いているかチェック
      const allAvailable = userIds.every(userId => {
        const userSchedules = schedulesByUser.get(userId) || [];
        const daySchedule = userSchedules.find(s => {
          const scheduleDate = s.date.toISOString().split('T')[0];
          return scheduleDate === dateStr;
        });
        
        // 未登録の場合はfalse（忙しい扱い）
        if (!daySchedule) {
          return false;
        }
        
        // いずれかの時間帯が空いていればtrue
        return daySchedule.timeSlotsDaytime || 
               daySchedule.timeSlotsEvening;
      });
      
      if (allAvailable) {
        commonDates.push(currentDate);
      }
    }
    
    // 連続した日程を見つける
    return this.findConsecutiveDates(commonDates, requiredDays);
  }

  /**
   * 柔軟な日程検索 - 連続でない日程も含めて検索
   */
  async getCommonAvailableDatesFlexible(
    userIds: string[],
    startDate: Date,
    endDate: Date,
    requiredDays: number,
    dateMode: 'consecutive' | 'flexible' | 'within_period' = 'consecutive'
  ): Promise<Date[]> {
    // 共通の空き日程を取得
    const commonDates = await this.getAllCommonAvailableDates(userIds, startDate, endDate);
    
    switch (dateMode) {
      case 'consecutive':
        return this.findConsecutiveDates(commonDates, requiredDays);
      
      case 'flexible':
        return this.findFlexibleDates(commonDates, requiredDays);
      
      case 'within_period':
        return this.findDatesWithinPeriod(commonDates, requiredDays, startDate, endDate);
      
      default:
        return this.findConsecutiveDates(commonDates, requiredDays);
    }
  }

  /**
   * 共通の空き日程を全て取得（連続性は考慮しない）
   */
  private async getAllCommonAvailableDates(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Date[]> {
    // 指定期間内の全スケジュールを取得
    const allSchedules = await prisma.userSchedule.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [
        { userId: 'asc' },
        { date: 'asc' }
      ]
    });
    
    // ユーザーIDごとにグループ化
    const schedulesByUser = new Map<string, PrismaUserSchedule[]>();
    for (const schedule of allSchedules) {
      if (!schedulesByUser.has(schedule.userId)) {
        schedulesByUser.set(schedule.userId, []);
      }
      schedulesByUser.get(schedule.userId)!.push(schedule);
    }

    const commonDates: Date[] = [];
    
    // 日付ごとにチェック（最大100日間に制限）
    let dayCount = 0;
    for (let d = new Date(startDate); d <= endDate && dayCount < 100; d = new Date(d.getTime() + 24 * 60 * 60 * 1000), dayCount++) {
      const currentDate = new Date(d);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // 全ユーザーがこの日に空いているかチェック
      const allAvailable = userIds.every(userId => {
        const userSchedules = schedulesByUser.get(userId) || [];
        const daySchedule = userSchedules.find(s => {
          const scheduleDate = s.date.toISOString().split('T')[0];
          return scheduleDate === dateStr;
        });
        
        // 未登録の場合はfalse（忙しい扱い）
        if (!daySchedule) {
          return false;
        }
        
        // いずれかの時間帯が空いていればtrue
        return daySchedule.timeSlotsDaytime || 
               daySchedule.timeSlotsEvening;
      });
      
      if (allAvailable) {
        commonDates.push(currentDate);
      }
    }
    
    return commonDates.sort((a, b) => a.getTime() - b.getTime());
  }

  private findConsecutiveDates(dates: Date[], requiredDays: number): Date[] {
    if (dates.length < requiredDays) return [];
    
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    for (let i = 0; i <= dates.length - requiredDays; i++) {
      const consecutiveDates: Date[] = [dates[i]];
      
      // Check if we already have enough dates (handles requiredDays = 1 case)
      if (consecutiveDates.length === requiredDays) {
        return consecutiveDates;
      }
      
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

  /**
   * 柔軟な日程検索 - 連続でなくても必要日数分の日程を取得
   */
  private findFlexibleDates(dates: Date[], requiredDays: number): Date[] {
    if (dates.length < requiredDays) return [];
    
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    // 単純に最初のN日間を返す
    return dates.slice(0, requiredDays);
  }

  /**
   * 期間内の日程検索 - 指定期間内で必要日数分の日程を取得
   */
  private findDatesWithinPeriod(
    dates: Date[], 
    requiredDays: number, 
    periodStart: Date, 
    periodEnd: Date
  ): Date[] {
    if (dates.length < requiredDays) return [];
    
    // 期間内の日程のみをフィルタリング
    const datesInPeriod = dates.filter(date => 
      date >= periodStart && date <= periodEnd
    );
    
    if (datesInPeriod.length < requiredDays) return [];
    
    datesInPeriod.sort((a, b) => a.getTime() - b.getTime());
    
    // 期間内で最初のN日間を返す
    return datesInPeriod.slice(0, requiredDays);
  }

  async deleteSchedule(userId: string, date: Date): Promise<void> {
    await prisma.userSchedule.delete({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    });
  }

  async deleteSchedules(userId: string, dates: Date[]): Promise<void> {
    await prisma.userSchedule.deleteMany({
      where: {
        userId,
        date: {
          in: dates
        }
      }
    });
  }

  async deleteAllUserSchedules(userId: string): Promise<void> {
    await prisma.userSchedule.deleteMany({
      where: { userId }
    });
  }

  /**
   * 特定のユーザーが特定の日付・時間帯で空いているかチェック
   */
  async isUserAvailableAtTimeSlot(
    userId: string,
    date: Date,
    timeSlot: TimeSlot
  ): Promise<boolean> {
    const schedule = await this.getScheduleByUserAndDate(userId, date);
    
    // スケジュールが登録されていない場合は忙しい扱い
    if (!schedule) {
      return false;
    }
    
    // 指定された時間帯が空いているかチェック
    switch (timeSlot) {
      case 'daytime':
        return schedule.timeSlots.daytime;
      case 'evening':
        return schedule.timeSlots.evening;
      default:
        return false;
    }
  }

  /**
   * 特定のユーザーが特定の日付で何かの時間帯で空いているかチェック
   */
  async isUserAvailableOnDate(
    userId: string,
    date: Date
  ): Promise<{ daytime: boolean; evening: boolean }> {
    const schedule = await this.getScheduleByUserAndDate(userId, date);
    
    if (!schedule) {
      return { daytime: false, evening: false };
    }
    
    return {
      daytime: schedule.timeSlots.daytime,
      evening: schedule.timeSlots.evening
    };
  }

  private mapPrismaToSchedule(prismaSchedule: PrismaUserSchedule): UserSchedule {
    return {
      id: prismaSchedule.id,
      userId: prismaSchedule.userId,
      date: prismaSchedule.date,
      timeSlots: {
        daytime: Boolean(prismaSchedule.timeSlotsDaytime),
        evening: Boolean(prismaSchedule.timeSlotsEvening),
      },
      createdAt: prismaSchedule.createdAt,
      updatedAt: prismaSchedule.updatedAt
    };
  }
}

export const scheduleStorage = new ScheduleStorage();