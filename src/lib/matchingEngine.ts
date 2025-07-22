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
        event.requiredParticipants, // 後方互換性のため直接使用
        event.maxParticipants || null,
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
    // 最小参加者数は1人以上である必要がある
    if (event.requiredParticipants < 1) {
      return false;
    }
    
    // 必要時間数は1時間以上である必要がある
    if (event.requiredHours < 1) {
      return false;
    }
    
    // 最小参加者数を満たしているかチェック
    if (event.participants.length < event.requiredParticipants) {
      return false;
    }
    
    // 最大参加者数制限がある場合はチェック（通常はマッチング時に制限内で選択）
    if (event.maxParticipants && event.participants.length > event.maxParticipants) {
      // この場合は警告のみ - 実際のマッチングでは適切に選択される
      console.warn(`Event ${event.id} has more participants than maxParticipants. Will select optimal subset.`);
    }
    
    return true;
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
        this.isSameDate(s.date, date)
      );
      
      if (!userSchedule) {
        return false; // スケジュールが登録されていない場合は利用不可
      }

      // 終日空いている場合は、evening時間帯も含めて利用可能
      if (timeSlot === 'evening') {
        return userSchedule.timeSlots.evening || userSchedule.timeSlots.fullday;
      }
      
      return userSchedule.timeSlots.fullday;
    });
  }

  /**
   * 最適な参加者組み合わせを選択
   * 1. 必要時間数を満たせる組み合わせ
   * 2. 参加人数が多い方を優先（最大人数制限内で）
   * 3. 複数候補がある場合は先着順（参加登録順）
   */
  private findOptimalParticipantCombination(
    availableSlotCombinations: SlotCombination[],
    requiredHours: number,
    minParticipants: number,
    maxParticipants: number | null,
    eventParticipants: string[] // 参加登録順の配列
  ): { timeSlots: TimeSlot[]; participants: string[] } | null {
    // 最小人数を満たせる組み合わせを優先、時間数が多い順、日付が早い順でソート
    const validCombinations = availableSlotCombinations.filter(
      combination => combination.availableParticipants.length >= minParticipants
    );
    
    const sortedCombinations = [...validCombinations].sort((a, b) => {
      // 参加者数で比較（多い順）- より多くの参加者を優先
      const participantsDiff = b.availableParticipants.length - a.availableParticipants.length;
      if (participantsDiff !== 0) return participantsDiff;
      
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
      if (slotHours >= requiredHours && combination.availableParticipants.length >= minParticipants) {
        // 参加人数の決定：最大人数制限がある場合はその範囲内で、ない場合は最小人数ちょうど
        const targetParticipants = maxParticipants !== null ? 
          Math.min(combination.availableParticipants.length, maxParticipants) : 
          minParticipants;
        
        // 先着順（参加登録順）で目標人数を選択
        const selectedParticipants = this.selectParticipantsInRegistrationOrder(
          combination.availableParticipants,
          eventParticipants,
          targetParticipants
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
      minParticipants,
      maxParticipants,
      eventParticipants
    );
    
    return multiDayMatch;
  }

  /**
   * 利用可能な参加者数から最大参加人数を決定
   * 参加人数が多い方を優先（最大人数制限内で）
   */
  private determineMaximumParticipantCount(
    availableCount: number,
    minParticipants: number,
    maxParticipants: number | null
  ): number {
    // 最大参加者数制限を適用（無制限の場合は利用可能数そのまま）
    const effectiveMax = maxParticipants !== null ? maxParticipants : availableCount;
    const maxAllowed = Math.min(availableCount, effectiveMax);
    
    // 最大人数内で最多を選択（最小人数以上）
    return Math.max(minParticipants, maxAllowed);
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
    minParticipants: number,
    maxParticipants: number | null,
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
      minParticipants,
      maxParticipants,
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
    minParticipants: number,
    maxParticipants: number | null,
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

        // 最小人数を満たせない場合はスキップ
        if (commonParticipants.size < minParticipants) {
          break;
        }

        candidateSlots.push(bestSlotForDay.slot);
        currentHours += getTimeSlotHours(bestSlotForDay.slot.timeSlot);
        isFirst = false;

        // 必要時間数を満たした場合
        if (currentHours >= requiredHours) {
          // 参加人数の決定：最大人数制限がある場合はその範囲内で、ない場合は最小人数ちょうど
          const targetParticipants = maxParticipants !== null ? 
            Math.min(commonParticipants.size, maxParticipants) : 
            minParticipants;
          
          const selectedParticipants = this.selectParticipantsInRegistrationOrder(
            Array.from(commonParticipants),
            eventParticipants,
            targetParticipants
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

  /**
   * タイムゾーンに依存しない日付比較
   * toDateString()ではなく年月日を直接比較してタイムゾーン問題を回避
   */
  private isSameDate(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

}

// エクスポート
export const matchingEngine = new MatchingEngine();