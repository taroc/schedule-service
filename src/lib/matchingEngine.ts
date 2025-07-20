/**
 * 🟢 Green Phase: マッチングエンジンの最小実装
 * 
 * テストを通すための最小限の機能を実装
 * t-wadaさんのTDD方法論に従い、テストが通ることを最優先
 */

import { eventStorage } from '@/lib/eventStorage';
import { scheduleStorage } from '@/lib/scheduleStorage';
import type { Event } from '@/types/event';
import { getTimeSlotHours, type TimeSlot as TimeSlotType, type UserSchedule } from '@/types/schedule';

// 型定義
export interface TimeSlot {
  date: Date;
  timeSlot: TimeSlotType; // 'evening' | 'fullday'
}

export interface MatchingResult {
  isMatched: boolean;
  reason: string;
  matchedTimeSlots?: TimeSlot[];
}

// Event型とUserSchedule型は@/types/からインポート済み

/**
 * マッチングエンジンクラス
 */
class MatchingEngine {
  /**
   * イベントのマッチング判定を実行
   */
  async checkEventMatching(eventId: string): Promise<MatchingResult> {
    try {
      // イベント情報を取得
      const event = await eventStorage.getEventById(eventId);
      
      if (!event) {
        return {
          isMatched: false,
          reason: 'イベントが見つかりません'
        };
      }

      // 参加者数チェック
      if (!(await this.validateParticipants(event))) {
        return {
          isMatched: false,
          reason: '参加者数が不足しています'
        };
      }

      // 参加者のスケジュールを取得
      const schedules = await scheduleStorage.getSchedulesByUserIds(
        event.participants,
        event.periodStart,
        event.periodEnd
      );

      // 利用可能な時間スロットを検索
      const availableTimeSlots = this.findAvailableTimeSlots(event, schedules);

      // 必要時間数をチェック
      const matchedSlots = this.findBestTimeSlotCombination(
        availableTimeSlots,
        event.requiredHours
      );

      if (matchedSlots.length === 0) {
        return {
          isMatched: false,
          reason: '時間数が不足しています'
        };
      }

      // マッチング成功
      return {
        isMatched: true,
        reason: 'マッチング成功',
        matchedTimeSlots: matchedSlots
      };

    } catch (error) {
      console.error('マッチング処理でエラーが発生:', error);
      return {
        isMatched: false,
        reason: 'マッチング処理中にエラーが発生しました'
      };
    }
  }

  /**
   * 利用可能な時間スロットを検索
   */
  findAvailableTimeSlots(event: Event, schedules: UserSchedule[]): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];
    
    // 期間内の各日をチェック
    const currentDate = new Date(event.periodStart);
    const endDate = new Date(event.periodEnd);

    while (currentDate <= endDate) {
      // 夜の時間スロットをチェック（3時間）
      if (this.isTimeSlotAvailableForAllParticipants(
        currentDate,
        'evening',
        event.participants,
        schedules
      )) {
        availableSlots.push({
          date: new Date(currentDate),
          timeSlot: 'evening'
        });
      }

      // 終日の時間スロットをチェック（10時間）
      if (this.isTimeSlotAvailableForAllParticipants(
        currentDate,
        'fullday',
        event.participants,
        schedules
      )) {
        availableSlots.push({
          date: new Date(currentDate),
          timeSlot: 'fullday'
        });
      }

      // 翌日へ
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
  }

  /**
   * 参加者検証
   */
  async validateParticipants(event: Event): Promise<boolean> {
    return event.participants.length >= event.requiredParticipants;
  }

  /**
   * 特定の時間スロットがすべての参加者で利用可能かチェック
   */
  private isTimeSlotAvailableForAllParticipants(
    date: Date,
    timeSlot: TimeSlotType,
    participants: string[],
    schedules: UserSchedule[]
  ): boolean {
    return participants.every(participantId => {
      const userSchedule = schedules.find(
        s => s.userId === participantId && 
        s.date.toDateString() === date.toDateString()
      );
      
      if (!userSchedule) {
        return false; // スケジュールが登録されていない場合は利用不可
      }

      return timeSlot === 'evening' ? userSchedule.timeSlots.evening : userSchedule.timeSlots.fullday;
    });
  }

  /**
   * 必要時間数に合う最適な時間スロット組み合わせを検索
   */
  private findBestTimeSlotCombination(
    availableSlots: TimeSlot[],
    requiredHours: number
  ): TimeSlot[] {
    // 時間スロットを効率的に組み合わせるため、長い時間スロットから優先
    const sortedSlots = [...availableSlots].sort((a, b) => {
      const hoursA = getTimeSlotHours(a.timeSlot);
      const hoursB = getTimeSlotHours(b.timeSlot);
      
      // 時間数が多い順、同じ時間数なら日付順
      if (hoursA !== hoursB) {
        return hoursB - hoursA;
      }
      return a.date.getTime() - b.date.getTime();
    });

    // 動的プログラミングで最適な組み合わせを探索
    const result: TimeSlot[] = [];
    let totalHours = 0;
    
    for (const slot of sortedSlots) {
      const slotHours = getTimeSlotHours(slot.timeSlot);
      if (totalHours + slotHours <= requiredHours || result.length === 0) {
        result.push(slot);
        totalHours += slotHours;
        
        if (totalHours >= requiredHours) {
          break;
        }
      }
    }

    // 必要時間数に達していない場合は空配列を返す
    return totalHours >= requiredHours ? result : [];
  }

}

// エクスポート
export const matchingEngine = new MatchingEngine();