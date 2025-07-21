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

// 内部で使用する型定義
interface SlotCombination {
  slot: TimeSlot;
  availableParticipants: string[];
}

// Event型とUserSchedule型は@/types/からインポート済み

// 定数定義
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * マッチングエンジンクラス
 * 
 * 優先順位：
 * 1. 終日の日程で完結する
 * 2. できるだけ連続する日程になっている
 * 3. 参加表明の早いユーザー（先着順）
 * 4. それでも決まらない場合はランダム抽選（未実装）
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
        event.requiredParticipants,
        event.participants
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
  findAvailableTimeSlots(event: Event, schedules: UserSchedule[]): SlotCombination[] {
    const availableSlots: SlotCombination[] = [];
    
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
   * 2. 必要人数ちょうどを選択
   * 3. 複数候補がある場合は先着順（参加登録順）
   */
  private findOptimalParticipantCombination(
    availableSlotCombinations: SlotCombination[],
    requiredHours: number,
    requiredParticipants: number,
    eventParticipants: string[] // 参加登録順の配列
  ): { timeSlots: TimeSlot[]; participants: string[] } | null {
    // 必要人数を満たせる組み合わせを優先、時間数が多い順、日付が早い順でソート
    const validCombinations = availableSlotCombinations.filter(
      combination => combination.availableParticipants.length >= requiredParticipants
    );
    
    const sortedCombinations = [...validCombinations].sort((a, b) => {
      // 時間数で比較（多い順）- より長い時間スロットを優先
      const hoursA = getTimeSlotHours(a.slot.timeSlot);
      const hoursB = getTimeSlotHours(b.slot.timeSlot);
      const hoursDiff = hoursB - hoursA;
      if (hoursDiff !== 0) return hoursDiff;
      
      // 日付で比較（早い順）- より早い日付を優先
      return a.slot.date.getTime() - b.slot.date.getTime();
    });

    // 最適な組み合わせを探索
    for (const combination of sortedCombinations) {
      const slotHours = getTimeSlotHours(combination.slot.timeSlot);
      
      // 単一の時間スロットで必要時間数を満たす場合
      if (slotHours >= requiredHours && combination.availableParticipants.length >= requiredParticipants) {
        // 先着順（参加登録順）で必要人数ちょうど選択
        const selectedParticipants = this.selectParticipantsInRegistrationOrder(
          combination.availableParticipants,
          eventParticipants,
          requiredParticipants
        );
        
        return {
          timeSlots: [combination.slot],
          participants: selectedParticipants
        };
      }
    }

    // 複数の時間スロット組み合わせによるマッチング
    const multiDayMatch = this.findMultiDayConsecutiveMatch(
      sortedCombinations,
      requiredHours,
      requiredParticipants,
      eventParticipants
    );
    
    return multiDayMatch;
  }

  /**
   * 参加登録順で必要人数ちょうど選択
   */
  private selectParticipantsInRegistrationOrder(
    availableParticipants: string[],
    eventParticipants: string[],
    requiredCount: number
  ): string[] {
    // 参加登録順でソート
    const sortedAvailableParticipants = availableParticipants.sort((a, b) => {
      const indexA = eventParticipants.indexOf(a);
      const indexB = eventParticipants.indexOf(b);
      return indexA - indexB;
    });

    // 必要人数ちょうど選択
    return sortedAvailableParticipants.slice(0, requiredCount);
  }

  /**
   * 複数日間の連続日程マッチングを検索
   * 連続する日程を優先して選択
   */
  private findMultiDayConsecutiveMatch(
    sortedCombinations: SlotCombination[],
    requiredHours: number,
    requiredParticipants: number,
    eventParticipants: string[]
  ): { timeSlots: TimeSlot[]; participants: string[] } | null {
    // 日付ごとにグループ化
    const slotsByDate = new Map<string, SlotCombination[]>();

    sortedCombinations.forEach(combination => {
      const dateKey = combination.slot.date.toDateString();
      if (!slotsByDate.has(dateKey)) {
        slotsByDate.set(dateKey, []);
      }
      slotsByDate.get(dateKey)!.push(combination);
    });

    // 日付を取得してソート
    const availableDates = Array.from(slotsByDate.keys())
      .map(dateKey => new Date(dateKey))
      .sort((a, b) => a.getTime() - b.getTime());

    // 連続日程の組み合わせを探索
    return this.findConsecutiveDateCombination(
      availableDates,
      slotsByDate,
      requiredHours,
      requiredParticipants,
      eventParticipants
    );
  }

  /**
   * 連続日程の組み合わせを探索
   */
  private findConsecutiveDateCombination(
    availableDates: Date[],
    slotsByDate: Map<string, SlotCombination[]>,
    requiredHours: number,
    requiredParticipants: number,
    eventParticipants: string[]
  ): { timeSlots: TimeSlot[]; participants: string[] } | null {
    // 連続する日程を優先して探索
    for (let startIndex = 0; startIndex < availableDates.length; startIndex++) {
      let currentHours = 0;
      const candidateSlots: TimeSlot[] = [];
      let commonParticipants = new Set<string>();
      let isFirst = true;

      for (let dayIndex = startIndex; dayIndex < availableDates.length; dayIndex++) {
        const currentDate = availableDates[dayIndex];
        const dateKey = currentDate.toDateString();
        const daySlots = slotsByDate.get(dateKey) || [];

        // 前の日と連続しているかチェック（最初の日以外）
        if (!isFirst) {
          const previousDate = availableDates[dayIndex - 1];
          const dayDiff = (currentDate.getTime() - previousDate.getTime()) / MILLISECONDS_PER_DAY;
          if (dayDiff > 1) {
            // 連続していない場合は現在の組み合わせで判定
            break;
          }
        }

        // その日で最適なスロットを選択（終日優先）
        const bestSlotForDay = daySlots
          .sort((a, b) => {
            const hoursA = getTimeSlotHours(a.slot.timeSlot);
            const hoursB = getTimeSlotHours(b.slot.timeSlot);
            return hoursB - hoursA; // 時間数の多い順（終日優先）
          })[0];

        if (!bestSlotForDay) continue;

        // 共通参加者を計算
        const dayParticipants = new Set(bestSlotForDay.availableParticipants);
        if (isFirst) {
          commonParticipants = dayParticipants;
        } else {
          commonParticipants = new Set([...commonParticipants].filter(x => dayParticipants.has(x)));
        }

        // 必要人数を満たせない場合はスキップ
        if (commonParticipants.size < requiredParticipants) {
          break;
        }

        candidateSlots.push(bestSlotForDay.slot);
        currentHours += getTimeSlotHours(bestSlotForDay.slot.timeSlot);
        isFirst = false;

        // 必要時間数を満たした場合
        if (currentHours >= requiredHours) {
          const selectedParticipants = this.selectParticipantsInRegistrationOrder(
            Array.from(commonParticipants),
            eventParticipants,
            requiredParticipants
          );

          return {
            timeSlots: candidateSlots,
            participants: selectedParticipants
          };
        }
      }
    }

    return null;
  }

}

// エクスポート
export const matchingEngine = new MatchingEngine();