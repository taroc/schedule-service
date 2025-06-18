import { UserSchedule, BulkAvailabilityRequest } from '@/types/schedule';
import { prisma } from './prisma';
import { UserSchedule as PrismaUserSchedule } from '@prisma/client';

class ScheduleStorage {
  async bulkSetAvailability(request: BulkAvailabilityRequest, userId: string): Promise<UserSchedule[]> {
    return await prisma.$transaction(async (tx) => {
      const processedSchedules: UserSchedule[] = [];

      for (const dateString of request.dates) {
        const date = new Date(dateString + 'T00:00:00.000Z'); // UTC日付として作成

        // 既存の予定を検索
        const existingSchedule = await tx.userSchedule.findUnique({
          where: {
            userId_date: {
              userId: userId,
              date: date
            }
          }
        });

        if (existingSchedule) {
          // 既存の予定を更新（OR演算で時間帯を追加）
          const newTimeSlots = {
            morning: request.timeSlots.morning || Boolean(existingSchedule.timeSlotsMorning),
            afternoon: request.timeSlots.afternoon || Boolean(existingSchedule.timeSlotsAfternoon),
            fullday: request.timeSlots.fullday || Boolean(existingSchedule.timeSlotsFullday),
          };

          const updatedSchedule = await tx.userSchedule.update({
            where: {
              userId_date: {
                userId: userId,
                date: date
              }
            },
            data: {
              timeSlotsMorning: newTimeSlots.morning,
              timeSlotsAfternoon: newTimeSlots.afternoon,
              timeSlotsFullday: newTimeSlots.fullday,
            }
          });

          processedSchedules.push(this.mapPrismaToSchedule(updatedSchedule));
        } else {
          // 新しい予定を作成
          const scheduleId = Math.random().toString(36).substring(2, 15);

          const newSchedule = await tx.userSchedule.create({
            data: {
              id: scheduleId,
              userId: userId,
              date: date,
              timeSlotsMorning: request.timeSlots.morning,
              timeSlotsAfternoon: request.timeSlots.afternoon,
              timeSlotsFullday: request.timeSlots.fullday,
            }
          });

          processedSchedules.push(this.mapPrismaToSchedule(newSchedule));
        }
      }

      return processedSchedules;
    });
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
    const schedules = await prisma.userSchedule.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
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
      .filter(s => s.timeSlots.morning || s.timeSlots.afternoon || s.timeSlots.fullday)
      .map(s => s.date);
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
    
    // 日付ごとにチェック
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
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
        return daySchedule.timeSlotsMorning || 
               daySchedule.timeSlotsAfternoon || 
               daySchedule.timeSlotsFullday;
      });
      
      if (allAvailable) {
        commonDates.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
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
    
    // 日付ごとにチェック
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
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
        return daySchedule.timeSlotsMorning || 
               daySchedule.timeSlotsAfternoon || 
               daySchedule.timeSlotsFullday;
      });
      
      if (allAvailable) {
        commonDates.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
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

  private mapPrismaToSchedule(prismaSchedule: PrismaUserSchedule): UserSchedule {
    return {
      id: prismaSchedule.id,
      userId: prismaSchedule.userId,
      date: prismaSchedule.date,
      timeSlots: {
        morning: Boolean(prismaSchedule.timeSlotsMorning),
        afternoon: Boolean(prismaSchedule.timeSlotsAfternoon),
        fullday: Boolean(prismaSchedule.timeSlotsFullday),
      },
      createdAt: prismaSchedule.createdAt,
      updatedAt: prismaSchedule.updatedAt
    };
  }
}

export const scheduleStorage = new ScheduleStorage();