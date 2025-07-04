import { eventStorage } from './eventStorage';
import { scheduleStorage } from './scheduleStorage';
import { Event } from '@/types/event';
import { TimeSlot, MatchingTimeSlot, UserSchedule } from '@/types/schedule';

export interface MatchingResult {
  eventId: string;
  isMatched: boolean;
  matchedTimeSlots: MatchingTimeSlot[];
  participants: string[];
  requiredTimeSlots: number;
  reason?: string;
}

export interface MatchingEngineStats {
  totalEventsChecked: number;
  matchedEvents: number;
  pendingEvents: number;
}

class MatchingEngine {
  /**
   * 指定されたイベントのマッチング判定を実行
   */
  async checkEventMatching(eventId: string): Promise<MatchingResult> {
    const event = await eventStorage.getEventById(eventId);
    
    if (!event) {
      return {
        eventId,
        isMatched: false,
        matchedTimeSlots: [],
        participants: [],
        requiredTimeSlots: 0,
        reason: 'Event not found'
      };
    }

    // イベントが既に成立している場合はスキップ
    if (event.status !== 'open') {
      return {
        eventId,
        isMatched: event.status === 'matched',
        matchedTimeSlots: event.matchedTimeSlots || [],
        participants: event.participants,
        requiredTimeSlots: event.requiredTimeSlots || 0,
        reason: `Event status is ${event.status}`
      };
    }

    // 期限切れチェック
    if (event.deadline && new Date() > event.deadline) {
      await eventStorage.updateEventStatus(eventId, 'expired');
      return {
        eventId,
        isMatched: false,
        matchedTimeSlots: [],
        participants: event.participants,
        requiredTimeSlots: event.requiredTimeSlots || 0,
        reason: 'Event deadline has passed'
      };
    }

    // 🟢 Green Phase: 参加者選択戦略に基づく参加者数チェック
    const participantCheckResult = await this.checkParticipantRequirements(event);
    if (!participantCheckResult.isValid) {
      return {
        eventId,
        isMatched: false,
        matchedTimeSlots: [],
        participants: event.participants,
        requiredTimeSlots: event.requiredTimeSlots || 0,
        reason: participantCheckResult.reason
      };
    }

    // 🟢 Green Phase: 参加者選択戦略に基づく参加者選択
    const selectedParticipants = await this.selectParticipants(event);
    
    // 🟢 Green Phase: マッチング戦略に基づくスケジュールマッチングを実行
    const requiredTimeSlots = event.requiredTimeSlots || 1;
    
    // 🔵 Refactor Phase: 選択された参加者でマッチングを実行（元のparticipantsを使わない）
    const eventForMatching = { ...event, participants: selectedParticipants };
    const matchingResult = await this.findMatchingTimeSlotsWithStrategy(
      eventForMatching,
      selectedParticipants,
      requiredTimeSlots
    );

    const isMatched = matchingResult.isMatched;
    const finalMatchedTimeSlots = matchingResult.timeSlots;

    // マッチした場合は自動的にイベントステータスを更新
    if (isMatched) {
      await eventStorage.updateEventStatus(eventId, 'matched', finalMatchedTimeSlots);
    }

    return {
      eventId,
      isMatched,
      matchedTimeSlots: finalMatchedTimeSlots,
      participants: selectedParticipants, // 🟢 Green Phase: 選択された参加者を返す
      requiredTimeSlots,
      reason: isMatched ? 'Successfully matched' : matchingResult.reason || 'No common available time slots found'
    };
  }

  /**
   * 全てのオープンなイベントのマッチング判定を実行
   */
  async checkAllEvents(): Promise<MatchingResult[]> {
    // 期限切れイベントを自動的に期限切れステータスに更新
    await this.expireOverdueEvents();
    
    const events = await eventStorage.getAllEvents();
    const openEvents = events.filter(event => event.status === 'open');
    
    const results: MatchingResult[] = [];
    
    for (const event of openEvents) {
      const result = await this.checkEventMatching(event.id);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 参加者全員の共通空き時間帯を検索（新しい時間帯対応）
   */
  private async findCommonAvailableTimeSlots(
    participantIds: string[],
    requiredTimeSlots: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MatchingTimeSlot[]> {
    const availableTimeSlots: MatchingTimeSlot[] = [];
    
    // 全参加者の指定期間内のスケジュールを一度に取得
    const allSchedules = new Map<string, UserSchedule[]>();
    for (const participantId of participantIds) {
      const schedules = await scheduleStorage.getUserSchedulesByDateRange(
        participantId,
        periodStart,
        periodEnd
      );
      allSchedules.set(participantId, schedules);
    }
    
    // 期間内の各日でループ（最大100日間に制限）
    let dayCount = 0;
    for (let d = new Date(periodStart); d <= periodEnd && dayCount < 100; d = new Date(d.getTime() + 24 * 60 * 60 * 1000), dayCount++) {
      const dateStr = d.toISOString().split('T')[0];
      
      // 各時間帯（昼、夜）でチェック
      const timeSlots: TimeSlot[] = ['daytime', 'evening'];
      for (const timeSlot of timeSlots) {
        // 全参加者がこの日時に空いているかチェック
        const isAvailable = participantIds.every(participantId => {
          const userSchedules = allSchedules.get(participantId) || [];
          const daySchedule = userSchedules.find(s => 
            s.date.toISOString().split('T')[0] === dateStr
          );
          
          if (!daySchedule) {
            return false; // スケジュール未登録は忙しい扱い
          }
          
          return timeSlot === 'daytime' ? daySchedule.timeSlots.daytime : daySchedule.timeSlots.evening;
        });
        
        if (isAvailable) {
          availableTimeSlots.push({
            date: new Date(d),
            timeSlot
          });
        }
      }
      
      // 必要数に達したら早期終了
      if (availableTimeSlots.length >= requiredTimeSlots) {
        break;
      }
    }
    
    return availableTimeSlots;
  }

  /**
   * 特定の日付・時間帯で全参加者が空いているかチェック
   */
  private async checkTimeSlotAvailability(
    participantIds: string[],
    date: Date,
    timeSlot: TimeSlot
  ): Promise<boolean> {
    for (const participantId of participantIds) {
      const isAvailable = await scheduleStorage.isUserAvailableAtTimeSlot(
        participantId,
        date,
        timeSlot
      );
      
      if (!isAvailable) {
        return false; // 一人でも空いていなければfalse
      }
    }
    
    return true; // 全員が空いている
  }



  /**
   * 期限切れイベントを自動的に期限切れステータスに更新
   */
  async expireOverdueEvents(): Promise<number> {
    return await eventStorage.expireOverdueEvents();
  }

  /**
   * 期限切れイベントを取得
   */
  async getExpiredEvents() {
    return await eventStorage.getExpiredEvents();
  }

  /**
   * マッチングエンジンの統計情報を取得
   */
  async getStats(): Promise<MatchingEngineStats> {
    const events = await eventStorage.getAllEvents();
    
    return {
      totalEventsChecked: events.length,
      matchedEvents: events.filter(e => e.status === 'matched').length,
      pendingEvents: events.filter(e => e.status === 'open').length
    };
  }

  /**
   * グローバルマッチング - 全イベントを考慮したダブルブッキング防止
   */
  async globalMatching(): Promise<MatchingResult[]> {
    // 期限切れイベントを処理
    await this.expireOverdueEvents();
    
    const events = await eventStorage.getAllEvents();
    const openEvents = events.filter(event => event.status === 'open');
    
    // 優先度順にソート
    const sortedEvents = this.sortEventsByPriority(openEvents);
    
    const results: MatchingResult[] = [];
    const occupiedDates = new Map<string, Set<string>>(); // userId -> Set<dateString>
    
    for (const event of sortedEvents) {
      // 参加者数チェック
      if (event.participants.length < event.requiredParticipants) {
        results.push({
          eventId: event.id,
          isMatched: false,
          matchedTimeSlots: [],
          participants: event.participants,
          requiredTimeSlots: event.requiredTimeSlots || 0,
          reason: `Insufficient participants: ${event.participants.length}/${event.requiredParticipants}`
        });
        continue;
      }

      // 各参加者の空き時間帯を取得（ダブルブッキングを考慮）
      const requiredTimeSlots = event.requiredTimeSlots || 1;
      const availableTimeSlots = await this.findAvailableTimeSlotsWithoutConflicts(
        event,
        occupiedDates
      );

      const isMatched = availableTimeSlots.length >= requiredTimeSlots;
      const finalMatchedTimeSlots = isMatched ? availableTimeSlots.slice(0, requiredTimeSlots) : [];

      if (isMatched) {
        // イベントを成立状態に更新
        await eventStorage.updateEventStatus(event.id, 'matched', finalMatchedTimeSlots);
        
        // 占有時間帯を記録
        for (const participant of event.participants) {
          if (!occupiedDates.has(participant)) {
            occupiedDates.set(participant, new Set());
          }
          for (const timeSlot of finalMatchedTimeSlots) {
            const timeSlotKey = `${timeSlot.date.toISOString().split('T')[0]}_${timeSlot.timeSlot}`;
            occupiedDates.get(participant)!.add(timeSlotKey);
          }
        }
      }

      results.push({
        eventId: event.id,
        isMatched,
        matchedTimeSlots: finalMatchedTimeSlots,
        participants: event.participants,
        requiredTimeSlots,
        reason: isMatched ? 'Successfully matched' : 'No available time slots without conflicts'
      });
    }
    
    return results;
  }

  /**
   * イベントを優先度順にソート
   */
  private sortEventsByPriority(events: Event[]): Event[] {
    // 参加者別優先度の実装は後回しにして、一旦作成日時順でソート
    return events.sort((a, b) => {
      // 期限が近い順
      if (a.deadline && b.deadline) {
        const deadlineDiff = a.deadline.getTime() - b.deadline.getTime();
        if (deadlineDiff !== 0) return deadlineDiff;
      }
      
      // 一方だけに期限がある場合、期限があるものを優先
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      
      // 作成日時の早い順
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * ダブルブッキングを考慮した空き時間帯検索
   */
  private async findAvailableTimeSlotsWithoutConflicts(
    event: Event,
    occupiedDates: Map<string, Set<string>>
  ): Promise<MatchingTimeSlot[]> {
    // 通常の空き時間帯検索
    const requiredTimeSlots = event.requiredTimeSlots || 1;
    const commonTimeSlots = await this.findCommonAvailableTimeSlots(
      event.participants,
      requiredTimeSlots,
      event.periodStart,
      event.periodEnd
    );

    // ダブルブッキングをチェック
    const availableTimeSlots = commonTimeSlots.filter(timeSlot => {
      const timeSlotKey = `${timeSlot.date.toISOString().split('T')[0]}_${timeSlot.timeSlot}`;
      
      // 全参加者がその時間帯に他のイベントで占有されていないかチェック
      return event.participants.every(participant => {
        const userOccupiedDates = occupiedDates.get(participant);
        return !userOccupiedDates || !userOccupiedDates.has(timeSlotKey);
      });
    });

    return availableTimeSlots;
  }

  /**
   * 🟢 Green Phase: マッチング戦略に基づく時間帯マッチング
   */
  private async findMatchingTimeSlotsWithStrategy(
    event: Event,
    participantIds: string[],
    requiredTimeSlots: number
  ): Promise<{ isMatched: boolean; timeSlots: MatchingTimeSlot[]; reason?: string }> {
    // デフォルト値の設定
    const strategy = event.matchingStrategy || 'consecutive';
    const timeSlotRestriction = event.timeSlotRestriction || 'both';
    const minimumConsecutive = event.minimumConsecutive || 1;

    // 時間帯制限を適用した空き時間帯を取得
    const availableTimeSlots = await this.findCommonAvailableTimeSlotsWithRestriction(
      participantIds,
      event.periodStart,
      event.periodEnd,
      timeSlotRestriction
    );

    if (availableTimeSlots.length < requiredTimeSlots) {
      return {
        isMatched: false,
        timeSlots: [],
        reason: timeSlotRestriction === 'daytime_only' ? 'insufficient daytime slots' :
                timeSlotRestriction === 'evening_only' ? 'insufficient evening slots' :
                'insufficient time slots'
      };
    }

    // マッチング戦略に基づく選択
    let selectedTimeSlots: MatchingTimeSlot[];
    
    if (strategy === 'consecutive') {
      selectedTimeSlots = this.selectConsecutiveTimeSlots(availableTimeSlots, requiredTimeSlots, minimumConsecutive);
      
      // 🔵 Refactor Phase: 最低連続コマ数のチェックを強化
      if (minimumConsecutive > 1 && !this.hasMinimumConsecutiveSlots(selectedTimeSlots, minimumConsecutive)) {
        return {
          isMatched: false,
          timeSlots: [],
          reason: 'minimum consecutive requirement not met'
        };
      }
    } else if (strategy === 'flexible') {
      selectedTimeSlots = this.selectFlexibleTimeSlots(availableTimeSlots, requiredTimeSlots);
    } else {
      // フォールバック: デフォルトロジック
      selectedTimeSlots = availableTimeSlots.slice(0, requiredTimeSlots);
    }

    return {
      isMatched: selectedTimeSlots.length >= requiredTimeSlots,
      timeSlots: selectedTimeSlots.slice(0, requiredTimeSlots)
    };
  }

  /**
   * 🟢 Green Phase: 時間帯制限を適用した空き時間帯取得
   */
  private async findCommonAvailableTimeSlotsWithRestriction(
    participantIds: string[],
    periodStart: Date,
    periodEnd: Date,
    timeSlotRestriction: string
  ): Promise<MatchingTimeSlot[]> {
    const availableTimeSlots: MatchingTimeSlot[] = [];
    
    // 全参加者の指定期間内のスケジュールを一度に取得
    const allSchedules = new Map<string, UserSchedule[]>();
    for (const participantId of participantIds) {
      const schedules = await scheduleStorage.getUserSchedulesByDateRange(
        participantId,
        periodStart,
        periodEnd
      );
      allSchedules.set(participantId, schedules);
    }
    
    // 時間帯の制限を決定
    const allowedTimeSlots: TimeSlot[] = [];
    if (timeSlotRestriction === 'both') {
      allowedTimeSlots.push('daytime', 'evening');
    } else if (timeSlotRestriction === 'daytime_only') {
      allowedTimeSlots.push('daytime');
    } else if (timeSlotRestriction === 'evening_only') {
      allowedTimeSlots.push('evening');
    }
    
    // 期間内の各日でループ（最大100日間に制限）
    let dayCount = 0;
    for (let d = new Date(periodStart); d <= periodEnd && dayCount < 100; d = new Date(d.getTime() + 24 * 60 * 60 * 1000), dayCount++) {
      const dateStr = d.toISOString().split('T')[0];
      
      // 許可された時間帯でチェック
      for (const timeSlot of allowedTimeSlots) {
        // 全参加者がこの日時に空いているかチェック
        const isAvailable = participantIds.every(participantId => {
          const userSchedules = allSchedules.get(participantId) || [];
          const daySchedule = userSchedules.find(s => 
            s.date.toISOString().split('T')[0] === dateStr
          );
          
          if (!daySchedule) {
            return false; // スケジュール未登録は忙しい扱い
          }
          
          return timeSlot === 'daytime' ? daySchedule.timeSlots.daytime : daySchedule.timeSlots.evening;
        });
        
        if (isAvailable) {
          availableTimeSlots.push({
            date: new Date(d),
            timeSlot
          });
        }
      }
    }
    
    return availableTimeSlots;
  }

  /**
   * 🟢 Green Phase: 連続優先での時間帯選択
   */
  private selectConsecutiveTimeSlots(
    availableTimeSlots: MatchingTimeSlot[],
    requiredTimeSlots: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _minimumConsecutive: number
  ): MatchingTimeSlot[] {
    if (availableTimeSlots.length < requiredTimeSlots) {
      return availableTimeSlots;
    }

    // 🟢 Green Phase: 連続性優先の最小限実装
    // 日付順でソートして、連続した時間帯を優先して選択
    const sorted = [...availableTimeSlots].sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      
      // 同日の場合は昼→夜の順
      if (a.timeSlot === 'daytime' && b.timeSlot === 'evening') return -1;
      if (a.timeSlot === 'evening' && b.timeSlot === 'daytime') return 1;
      return 0;
    });

    // 連続性を評価してスコア付け
    const scoredSlots = sorted.map(slot => ({
      slot,
      score: this.calculateConsecutiveScore(slot, sorted)
    }));

    // スコア順でソート（高スコアが優先）
    scoredSlots.sort((a, b) => b.score - a.score);

    const selected: MatchingTimeSlot[] = [];
    const usedDates = new Set<string>();

    for (const { slot } of scoredSlots) {
      if (selected.length >= requiredTimeSlots) break;

      const dateKey = slot.date.toISOString().split('T')[0];
      const timeSlotKey = `${dateKey}_${slot.timeSlot}`;

      // 重複チェック
      if (usedDates.has(timeSlotKey)) continue;

      selected.push(slot);
      usedDates.add(timeSlotKey);
    }

    return selected.slice(0, requiredTimeSlots);
  }

  /**
   * 🟢 Green Phase: 連続性スコア計算
   */
  private calculateConsecutiveScore(
    slot: MatchingTimeSlot,
    allSlots: MatchingTimeSlot[]
  ): number {
    let score = 0;
    const slotTime = slot.date.getTime();

    // 早い日程ほど高スコア（最大100点）
    const earliestTime = Math.min(...allSlots.map(s => s.date.getTime()));
    const latestTime = Math.max(...allSlots.map(s => s.date.getTime()));
    const timeRange = latestTime - earliestTime;
    if (timeRange > 0) {
      score += (1 - (slotTime - earliestTime) / timeRange) * 100;
    } else {
      score += 100; // 全て同じ日程の場合
    }

    // 連続性ボーナス
    const dateStr = slot.date.toISOString().split('T')[0];
    const sameDate = allSlots.filter(s => 
      s.date.toISOString().split('T')[0] === dateStr
    );

    // 同日に昼・夜両方がある場合の連続性ボーナス
    if (sameDate.length >= 2) {
      const hasDaytime = sameDate.some(s => s.timeSlot === 'daytime');
      const hasEvening = sameDate.some(s => s.timeSlot === 'evening');
      
      if (hasDaytime && hasEvening) {
        // 昼→夜の連続を優先
        if (slot.timeSlot === 'daytime') {
          score += 50; // 昼のボーナス
        } else {
          score += 30; // 夜のボーナス（昼より低め）
        }
      }
    }

    return score;
  }

  /**
   * 🟢 Green Phase: 分散許可での時間帯選択
   */
  private selectFlexibleTimeSlots(
    availableTimeSlots: MatchingTimeSlot[],
    requiredTimeSlots: number
  ): MatchingTimeSlot[] {
    if (availableTimeSlots.length < requiredTimeSlots) {
      return availableTimeSlots;
    }

    // 分散許可モードでは早い日程を優先
    const sorted = [...availableTimeSlots].sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      
      // 同日の場合は昼→夜の順
      if (a.timeSlot === 'daytime' && b.timeSlot === 'evening') return -1;
      if (a.timeSlot === 'evening' && b.timeSlot === 'daytime') return 1;
      return 0;
    });

    return sorted.slice(0, requiredTimeSlots);
  }

  /**
   * 🔵 Refactor Phase: 最低連続コマ数の確認
   */
  private hasMinimumConsecutiveSlots(
    timeSlots: MatchingTimeSlot[],
    minimumConsecutive: number
  ): boolean {
    if (minimumConsecutive <= 1) return true;
    if (timeSlots.length < minimumConsecutive) return false;

    // 日付順でソート
    const sorted = [...timeSlots].sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      
      // 同日の場合は昼→夜の順
      if (a.timeSlot === 'daytime' && b.timeSlot === 'evening') return -1;
      if (a.timeSlot === 'evening' && b.timeSlot === 'daytime') return 1;
      return 0;
    });

    // 連続するコマをカウント
    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      
      const isConsecutive = this.areTimeSlotsConsecutive(prev, current);
      
      if (isConsecutive) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }

    return maxConsecutive >= minimumConsecutive;
  }

  /**
   * 🔵 Refactor Phase: 2つの時間帯が連続かどうかを判定
   */
  private areTimeSlotsConsecutive(
    slot1: MatchingTimeSlot,
    slot2: MatchingTimeSlot
  ): boolean {
    const date1 = slot1.date;
    const date2 = slot2.date;
    
    // 同日の昼→夜は連続
    if (date1.getTime() === date2.getTime()) {
      return slot1.timeSlot === 'daytime' && slot2.timeSlot === 'evening';
    }
    
    // 隣接日は連続
    const dayDiff = (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
    return dayDiff === 1;
  }

  /**
   * 🟢 Green Phase: 参加者選択戦略に基づく参加者要件チェック
   */
  private async checkParticipantRequirements(event: Event): Promise<{ isValid: boolean; reason?: string }> {
    const strategy = event.participantSelectionStrategy || 'first_come';
    const minParticipants = event.minParticipants || event.requiredParticipants;
    
    // 最小人数チェック
    if (event.participants.length < minParticipants) {
      return {
        isValid: false,
        reason: `Insufficient participants: ${event.participants.length}/${minParticipants} (minimum participants)`
      };
    }

    // 手動選択の場合の特別チェック
    if (strategy === 'manual') {
      const now = new Date();
      if (event.selectionDeadline && now < event.selectionDeadline) {
        return {
          isValid: false,
          reason: 'manual selection pending'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * 🟢 Green Phase: 参加者選択戦略に基づく参加者選択
   */
  private async selectParticipants(event: Event): Promise<string[]> {
    const strategy = event.participantSelectionStrategy || 'first_come';
    const minParticipants = event.minParticipants || event.requiredParticipants;
    const maxParticipants = event.maxParticipants;
    const optimalParticipants = event.optimalParticipants;

    // 作成者は必ず含む
    if (!event.participants.includes(event.creatorId)) {
      throw new Error('Creator must be in participants list');
    }

    let targetCount: number;
    
    // 目標人数を決定
    if (optimalParticipants && event.participants.length >= optimalParticipants) {
      targetCount = optimalParticipants;
    } else if (maxParticipants && event.participants.length > maxParticipants) {
      targetCount = maxParticipants;
    } else {
      targetCount = event.participants.length; // 全員選択
    }

    // 最小人数を下回らないように調整
    targetCount = Math.max(targetCount, minParticipants);

    // 参加者全員が対象より少ない場合は全員選択
    if (event.participants.length <= targetCount) {
      return event.participants;
    }

    // 戦略に基づく選択
    switch (strategy) {
      case 'first_come':
        return this.selectByFirstCome(event.participants, event.creatorId, targetCount);
      
      case 'lottery':
        // 🔵 Refactor Phase: 再現性のためにイベントIDベースのシード値を使用
        const seed = event.lotterySeed || this.generateSeedFromEventId(event.id);
        return this.selectByLottery(event.participants, event.creatorId, targetCount, seed);
      
      case 'manual':
        // 手動選択期限切れの場合は先着順フォールバック
        const now = new Date();
        if (!event.selectionDeadline || now >= event.selectionDeadline) {
          return this.selectByFirstCome(event.participants, event.creatorId, targetCount);
        }
        // 期限内の場合は全員返す（実際の選択は別途実装）
        return event.participants;
      
      default:
        return this.selectByFirstCome(event.participants, event.creatorId, targetCount);
    }
  }

  /**
   * 🟢 Green Phase: 先着順での参加者選択
   */
  private selectByFirstCome(
    allParticipants: string[],
    creatorId: string,
    targetCount: number
  ): string[] {
    // 作成者は必ず含む
    const selected = [creatorId];
    const others = allParticipants.filter(id => id !== creatorId);
    
    // 先着順で残りを選択
    const remainingSlots = targetCount - 1;
    selected.push(...others.slice(0, remainingSlots));
    
    return selected;
  }

  /**
   * 🟢 Green Phase: 抽選での参加者選択
   */
  private selectByLottery(
    allParticipants: string[],
    creatorId: string,
    targetCount: number,
    seed?: number
  ): string[] {
    // 作成者は必ず含む
    const selected = [creatorId];
    const others = allParticipants.filter(id => id !== creatorId);
    
    if (others.length === 0) {
      return selected;
    }
    
    // 🔵 Refactor Phase: 決定論的なソートベースの選択（シードベース）
    // 各参加者にシードベースのスコアを付与して決定論的に選択
    const effectiveSeed = seed || Date.now();
    const scoredParticipants = others.map(userId => ({
      userId,
      score: this.calculateLotteryScore(userId, effectiveSeed)
    }));
    
    // スコア順でソート（高スコアが優先）
    scoredParticipants.sort((a, b) => b.score - a.score);
    
    // 必要な人数分選択
    const remainingSlots = targetCount - 1;
    selected.push(...scoredParticipants.slice(0, remainingSlots).map(p => p.userId));
    
    return selected;
  }

  /**
   * 🟢 Green Phase: シードベースの疑似乱数生成器
   */
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % (2 ** 32);
      return state / (2 ** 32);
    };
  }

  /**
   * 🔵 Refactor Phase: イベントIDからシード値を生成
   */
  private generateSeedFromEventId(eventId: string): number {
    let hash = 0;
    for (let i = 0; i < eventId.length; i++) {
      const char = eventId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32-bit integer conversion
    }
    return Math.abs(hash);
  }

  /**
   * 🔵 Refactor Phase: 抽選用の決定論的スコア計算
   */
  private calculateLotteryScore(userId: string, seed: number): number {
    // ユーザーIDとシードを組み合わせてハッシュを計算
    const combined = `${userId}-${seed}`;
    let hash = 0;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32-bit integer conversion
    }
    
    // 正の値に変換して0-1の範囲に正規化
    return Math.abs(hash) / 2147483647; // 2^31 - 1
  }

}

export const matchingEngine = new MatchingEngine();