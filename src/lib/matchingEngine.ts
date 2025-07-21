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
  selectedParticipants?: string[]; // 最適な参加者組み合わせ
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

      // 利用可能な時間スロットと参加者組み合わせを検索
      const availableSlotCombinations = this.findAvailableTimeSlots(event, schedules);

      // 最適な時間スロット組み合わせと参加者を選択
      const bestMatch = this.findOptimalParticipantCombination(
        availableSlotCombinations,
        event.requiredHours,
        event.requiredParticipants
      );

      if (!bestMatch) {
        return {
          isMatched: false,
          reason: '参加者数が不足しています'
        };
      }

      // マッチング成功
      return {
        isMatched: true,
        reason: 'マッチング成功',
        matchedTimeSlots: bestMatch.timeSlots,
        selectedParticipants: bestMatch.participants
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
   * 各時間スロットで利用可能な参加者組み合わせを検索
   */
  findAvailableTimeSlots(event: Event, schedules: UserSchedule[]): Array<{
    slot: TimeSlot;
    availableParticipants: string[];
  }> {
    const availableSlots: Array<{
      slot: TimeSlot;
      availableParticipants: string[];
    }> = [];
    
    // 期間内の各日をチェック
    const currentDate = new Date(event.periodStart);
    const endDate = new Date(event.periodEnd);

    while (currentDate <= endDate) {
      // 夜の時間スロットで利用可能な参加者を探す（3時間）
      const eveningParticipants = this.getAvailableParticipantsForTimeSlot(
        currentDate,
        'evening',
        event.participants,
        schedules
      );
      
      if (eveningParticipants.length >= event.requiredParticipants) {
        availableSlots.push({
          slot: {
            date: new Date(currentDate),
            timeSlot: 'evening'
          },
          availableParticipants: eveningParticipants
        });
      }

      // 終日の時間スロットで利用可能な参加者を探す（10時間）
      const fulldayParticipants = this.getAvailableParticipantsForTimeSlot(
        currentDate,
        'fullday',
        event.participants,
        schedules
      );
      
      if (fulldayParticipants.length >= event.requiredParticipants) {
        availableSlots.push({
          slot: {
            date: new Date(currentDate),
            timeSlot: 'fullday'
          },
          availableParticipants: fulldayParticipants
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
   * 特定の時間スロットで利用可能な参加者のリストを取得
   */
  private getAvailableParticipantsForTimeSlot(
    date: Date,
    timeSlot: TimeSlotType,
    participants: string[],
    schedules: UserSchedule[]
  ): string[] {
    return participants.filter(participantId => {
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
   * 最適な参加者組み合わせを選択
   * 1. 必要時間数を満たせる組み合わせ
   * 2. より多くの参加者が参加できる組み合わせを優先
   */
  private findOptimalParticipantCombination(
    availableSlotCombinations: Array<{
      slot: TimeSlot;
      availableParticipants: string[];
    }>,
    requiredHours: number,
    requiredParticipants: number
  ): { timeSlots: TimeSlot[]; participants: string[] } | null {
    // 参加者数が多い順、時間数が多い順でソート
    const sortedCombinations = [...availableSlotCombinations].sort((a, b) => {
      // 参加者数で比較（多い順）
      const participantDiff = b.availableParticipants.length - a.availableParticipants.length;
      if (participantDiff !== 0) return participantDiff;
      
      // 時間数で比較（多い順）
      const hoursA = getTimeSlotHours(a.slot.timeSlot);
      const hoursB = getTimeSlotHours(b.slot.timeSlot);
      const hoursDiff = hoursB - hoursA;
      if (hoursDiff !== 0) return hoursDiff;
      
      // 日付で比較（早い順）
      return a.slot.date.getTime() - b.slot.date.getTime();
    });

    // 最適な組み合わせを探索
    for (const combination of sortedCombinations) {
      const slotHours = getTimeSlotHours(combination.slot.timeSlot);
      
      // 単一の時間スロットで必要時間数を満たす場合
      if (slotHours >= requiredHours && combination.availableParticipants.length >= requiredParticipants) {
        return {
          timeSlots: [combination.slot],
          participants: combination.availableParticipants.slice(0, Math.max(requiredParticipants, combination.availableParticipants.length))
        };
      }
    }

    // TODO: 複数の時間スロット組み合わせによるマッチング（将来拡張）
    // 現在は単一時間スロットでのマッチングのみ対応
    
    return null;
  }

}

// エクスポート
export const matchingEngine = new MatchingEngine();