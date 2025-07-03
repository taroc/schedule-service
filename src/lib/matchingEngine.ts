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

    // 参加者数チェック（作成者は既にparticipants配列に含まれている）
    if (event.participants.length < event.requiredParticipants) {
      return {
        eventId,
        isMatched: false,
        matchedTimeSlots: [],
        participants: event.participants,
        requiredTimeSlots: event.requiredTimeSlots || 0,
        reason: `Insufficient participants: ${event.participants.length}/${event.requiredParticipants}`
      };
    }

    // スケジュールマッチングを実行
    const requiredTimeSlots = event.requiredTimeSlots || 1;
    const matchedTimeSlots = await this.findCommonAvailableTimeSlots(
      event.participants,
      requiredTimeSlots,
      event.periodStart,
      event.periodEnd
    );

    const isMatched = matchedTimeSlots.length >= requiredTimeSlots;
    const finalMatchedTimeSlots = isMatched ? matchedTimeSlots.slice(0, requiredTimeSlots) : [];

    // マッチした場合は自動的にイベントステータスを更新
    if (isMatched) {
      await eventStorage.updateEventStatus(eventId, 'matched', finalMatchedTimeSlots);
    }

    return {
      eventId,
      isMatched,
      matchedTimeSlots: finalMatchedTimeSlots,
      participants: event.participants,
      requiredTimeSlots,
      reason: isMatched ? 'Successfully matched' : 'No common available time slots found'
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

}

export const matchingEngine = new MatchingEngine();