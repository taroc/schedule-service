import { UserSchedule, BulkAvailabilityRequest } from '@/types/schedule';
import { db, runInTransaction } from './database';

interface ScheduleRow {
  id: string;
  user_id: string;
  date: string;
  time_slots_morning: number;
  time_slots_afternoon: number;
  time_slots_fullday: number;
  created_at: string;
  updated_at: string;
}

class ScheduleStorage {
  private insertSchedule = db.prepare(`
    INSERT INTO user_schedules (id, user_id, date, time_slots_morning, time_slots_afternoon, time_slots_fullday, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  private updateSchedule = db.prepare(`
    UPDATE user_schedules 
    SET time_slots_morning = ?, time_slots_afternoon = ?, time_slots_fullday = ?, updated_at = datetime('now')
    WHERE user_id = ? AND date = ?
  `);

  private selectScheduleByUserAndDate = db.prepare(`
    SELECT * FROM user_schedules WHERE user_id = ? AND date = ?
  `);

  private selectSchedulesByUser = db.prepare(`
    SELECT * FROM user_schedules WHERE user_id = ? ORDER BY date
  `);

  private selectSchedulesByUserAndDateRange = db.prepare(`
    SELECT * FROM user_schedules 
    WHERE user_id = ? AND date >= ? AND date <= ?
    ORDER BY date
  `);

  private selectSchedulesInDateRange = db.prepare(`
    SELECT * FROM user_schedules 
    WHERE date >= ? AND date <= ?
    ORDER BY user_id, date
  `);

  private deleteSchedule = db.prepare(`
    DELETE FROM user_schedules WHERE user_id = ? AND date = ?
  `);

  async bulkSetAvailability(request: BulkAvailabilityRequest, userId: string): Promise<UserSchedule[]> {
    return runInTransaction(() => {
      const processedSchedules: UserSchedule[] = [];

      for (const dateString of request.dates) {
        const date = new Date(dateString);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

        // 既存の予定を検索
        const existingSchedule = this.selectScheduleByUserAndDate.get(userId, dateStr) as ScheduleRow | undefined;

        if (existingSchedule) {
          // 既存の予定を更新（OR演算で時間帯を追加）
          const newTimeSlots = {
            morning: request.timeSlots.morning || Boolean(existingSchedule.time_slots_morning),
            afternoon: request.timeSlots.afternoon || Boolean(existingSchedule.time_slots_afternoon),
            fullday: request.timeSlots.fullday || Boolean(existingSchedule.time_slots_fullday),
          };

          this.updateSchedule.run(
            newTimeSlots.morning ? 1 : 0,
            newTimeSlots.afternoon ? 1 : 0,
            newTimeSlots.fullday ? 1 : 0,
            userId,
            dateStr
          );

          // 更新後のデータを取得
          const updatedSchedule = this.selectScheduleByUserAndDate.get(userId, dateStr) as ScheduleRow;
          processedSchedules.push(this.mapRowToSchedule(updatedSchedule));
        } else {
          // 新しい予定を作成
          const scheduleId = Math.random().toString(36).substring(2, 15);

          this.insertSchedule.run(
            scheduleId,
            userId,
            dateStr,
            request.timeSlots.morning ? 1 : 0,
            request.timeSlots.afternoon ? 1 : 0,
            request.timeSlots.fullday ? 1 : 0
          );

          // 作成されたデータを取得
          const newSchedule = this.selectScheduleByUserAndDate.get(userId, dateStr) as ScheduleRow;
          processedSchedules.push(this.mapRowToSchedule(newSchedule));
        }
      }

      return processedSchedules;
    });
  }

  async getUserSchedules(userId: string): Promise<UserSchedule[]> {
    const scheduleRows = this.selectSchedulesByUser.all(userId) as ScheduleRow[];
    return scheduleRows.map(row => this.mapRowToSchedule(row));
  }

  async getUserSchedulesByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UserSchedule[]> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const scheduleRows = this.selectSchedulesByUserAndDateRange.all(
      userId,
      startDateStr,
      endDateStr
    ) as ScheduleRow[];

    return scheduleRows.map(row => this.mapRowToSchedule(row));
  }

  async getScheduleByUserAndDate(userId: string, date: Date): Promise<UserSchedule | null> {
    const dateStr = date.toISOString().split('T')[0];
    const scheduleRow = this.selectScheduleByUserAndDate.get(userId, dateStr) as ScheduleRow | undefined;

    if (!scheduleRow) {
      return null;
    }

    return this.mapRowToSchedule(scheduleRow);
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
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 指定期間内の全スケジュールを取得
    const allSchedules = this.selectSchedulesInDateRange.all(startDateStr, endDateStr) as ScheduleRow[];
    
    // ユーザーIDごとにグループ化
    const schedulesByUser = new Map<string, ScheduleRow[]>();
    for (const schedule of allSchedules) {
      if (!schedulesByUser.has(schedule.user_id)) {
        schedulesByUser.set(schedule.user_id, []);
      }
      schedulesByUser.get(schedule.user_id)!.push(schedule);
    }

    const commonDates: Date[] = [];
    
    // 日付ごとにチェック
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // 全ユーザーがこの日に空いているかチェック
      const allAvailable = userIds.every(userId => {
        const userSchedules = schedulesByUser.get(userId) || [];
        const daySchedule = userSchedules.find(s => s.date === dateStr);
        
        // 未登録の場合はfalse（忙しい扱い）
        if (!daySchedule) {
          return false;
        }
        
        // いずれかの時間帯が空いていればtrue
        return daySchedule.time_slots_morning || 
               daySchedule.time_slots_afternoon || 
               daySchedule.time_slots_fullday;
      });
      
      if (allAvailable) {
        commonDates.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
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

  private mapRowToSchedule(row: ScheduleRow): UserSchedule {
    return {
      id: row.id,
      userId: row.user_id,
      date: new Date(row.date + 'T00:00:00.000Z'), // UTC日付として解釈
      timeSlots: {
        morning: Boolean(row.time_slots_morning),
        afternoon: Boolean(row.time_slots_afternoon),
        fullday: Boolean(row.time_slots_fullday),
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const scheduleStorage = new ScheduleStorage();