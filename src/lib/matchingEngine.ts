/**
 * 🟢 Green Phase: マッチングエンジンの最小実装
 * 
 * テストを通すための最小限の機能を実装
 * t-wadaさんのTDD方法論に従い、テストが通ることを最優先
 */

import { eventStorage } from '@/lib/eventStorage';
import { scheduleStorage } from '@/lib/scheduleStorage';
import type { Event } from '@/types/event';

// 型定義
export interface TimeSlot {
  date: Date;
  timeSlot: 'daytime' | 'evening';
}

export interface MatchingResult {
  isMatched: boolean;
  reason: string;
  matchedTimeSlots?: TimeSlot[];
}

// Event型は@/types/eventからインポート済み

interface UserSchedule {
  userId: string;
  date: Date;
  daytime: boolean;
  evening: boolean;
}

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

      // 必要な時間スロット数をチェック
      if (availableTimeSlots.length < event.requiredTimeSlots) {
        return {
          isMatched: false,
          reason: '時間スロット不足です'
        };
      }

      // 連続した時間スロットを検索
      const consecutiveSlots = this.findConsecutiveTimeSlots(
        availableTimeSlots,
        event.requiredTimeSlots
      );

      if (consecutiveSlots.length === 0) {
        return {
          isMatched: false,
          reason: '連続した時間スロット不足です'
        };
      }

      // マッチング成功
      return {
        isMatched: true,
        reason: 'マッチング成功',
        matchedTimeSlots: consecutiveSlots.slice(0, event.requiredTimeSlots)
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
      // 午前の時間スロットをチェック
      if (this.isTimeSlotAvailableForAllParticipants(
        currentDate,
        'daytime',
        event.participants,
        schedules
      )) {
        availableSlots.push({
          date: new Date(currentDate),
          timeSlot: 'daytime'
        });
      }

      // 午後の時間スロットをチェック
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
    timeSlot: 'daytime' | 'evening',
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

      return timeSlot === 'daytime' ? userSchedule.daytime : userSchedule.evening;
    });
  }

  /**
   * 連続した時間スロットを検索
   */
  private findConsecutiveTimeSlots(
    availableSlots: TimeSlot[],
    requiredCount: number
  ): TimeSlot[] {
    if (requiredCount <= 1) {
      return availableSlots.slice(0, requiredCount);
    }

    // 時間スロットを時系列順にソート
    const sortedSlots = [...availableSlots].sort((a, b) => {
      const timeA = this.getTimeSlotOrder(a);
      const timeB = this.getTimeSlotOrder(b);
      return timeA - timeB;
    });

    // 連続した時間スロットを検索
    for (let i = 0; i <= sortedSlots.length - requiredCount; i++) {
      const consecutiveSlots = [sortedSlots[i]];
      
      for (let j = i + 1; j < sortedSlots.length && consecutiveSlots.length < requiredCount; j++) {
        const currentSlot = sortedSlots[j];
        const lastSlot = consecutiveSlots[consecutiveSlots.length - 1];
        
        if (this.isConsecutive(lastSlot, currentSlot)) {
          consecutiveSlots.push(currentSlot);
        } else {
          break;
        }
      }
      
      if (consecutiveSlots.length >= requiredCount) {
        return consecutiveSlots;
      }
    }

    return [];
  }

  /**
   * 時間スロットの順序を取得（ソート用）
   */
  private getTimeSlotOrder(slot: TimeSlot): number {
    const dateMs = slot.date.getTime();
    const timeOffset = slot.timeSlot === 'daytime' ? 0 : 1;
    return dateMs + timeOffset;
  }

  /**
   * 2つの時間スロットが連続しているかチェック
   */
  private isConsecutive(slot1: TimeSlot, slot2: TimeSlot): boolean {
    const date1 = new Date(slot1.date);
    const date2 = new Date(slot2.date);
    
    // 同じ日の午前→午後
    if (date1.toDateString() === date2.toDateString()) {
      return slot1.timeSlot === 'daytime' && slot2.timeSlot === 'evening';
    }
    
    // 連続する日の午後→午前
    const nextDay = new Date(date1);
    nextDay.setDate(nextDay.getDate() + 1);
    
    return (
      nextDay.toDateString() === date2.toDateString() &&
      slot1.timeSlot === 'evening' &&
      slot2.timeSlot === 'daytime'
    );
  }
}

// エクスポート
export const matchingEngine = new MatchingEngine();