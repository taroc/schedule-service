import { eventStorage } from './eventStorage';
import { scheduleStorage } from './scheduleStorage';
import { Event, DateMode } from '@/types/event';

export interface MatchingResult {
  eventId: string;
  isMatched: boolean;
  matchedDates: Date[];
  participants: string[];
  requiredDays: number;
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
        matchedDates: [],
        participants: [],
        requiredDays: 0,
        reason: 'Event not found'
      };
    }

    // イベントが既に成立している場合はスキップ
    if (event.status !== 'open') {
      return {
        eventId,
        isMatched: event.status === 'matched',
        matchedDates: event.matchedDates || [],
        participants: event.participants,
        requiredDays: event.requiredDays,
        reason: `Event status is ${event.status}`
      };
    }

    // 期限切れチェック
    if (event.deadline && new Date() > event.deadline) {
      await eventStorage.updateEventStatus(eventId, 'expired');
      return {
        eventId,
        isMatched: false,
        matchedDates: [],
        participants: event.participants,
        requiredDays: event.requiredDays,
        reason: 'Event deadline has passed'
      };
    }

    // 参加者数チェック
    if (event.participants.length < event.requiredParticipants) {
      return {
        eventId,
        isMatched: false,
        matchedDates: [],
        participants: event.participants,
        requiredDays: event.requiredDays,
        reason: `Insufficient participants: ${event.participants.length}/${event.requiredParticipants}`
      };
    }

    // スケジュールマッチングを実行
    const matchedDates = await this.findCommonAvailableDates(
      event.participants,
      event.requiredDays,
      event.dateMode,
      event.periodStart,
      event.periodEnd
    );

    const isMatched = matchedDates.length >= event.requiredDays;
    const finalMatchedDates = isMatched ? matchedDates.slice(0, event.requiredDays) : [];

    // マッチした場合は自動的にイベントステータスを更新
    if (isMatched) {
      await eventStorage.updateEventStatus(eventId, 'matched', finalMatchedDates);
    }

    return {
      eventId,
      isMatched,
      matchedDates: finalMatchedDates,
      participants: event.participants,
      requiredDays: event.requiredDays,
      reason: isMatched ? 'Successfully matched' : 'No common available dates found'
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
   * 参加者全員の共通空き日程を検索（柔軟な日程モード対応）
   */
  private async findCommonAvailableDates(
    participantIds: string[],
    requiredDays: number,
    dateMode: DateMode = 'consecutive',
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<Date[]> {
    let startDate: Date;
    let endDate: Date;

    if (dateMode === 'within_period' && periodStart && periodEnd) {
      // 期間指定モードの場合は指定された期間を使用
      startDate = periodStart;
      endDate = periodEnd;
    } else {
      // デフォルトの検索範囲（過去30日から未来30日間）
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
    }

    // 柔軟な日程検索を使用
    const commonDates = await scheduleStorage.getCommonAvailableDatesFlexible(
      participantIds,
      startDate,
      endDate,
      requiredDays,
      dateMode
    );

    return commonDates;
  }

  /**
   * 参加者が追加された時の自動マッチング実行
   */
  async onParticipantAdded(eventId: string): Promise<MatchingResult> {
    return await this.checkEventMatching(eventId);
  }

  /**
   * スケジュールが更新された時の関連イベントのマッチング再実行
   */
  async onScheduleUpdated(userId: string): Promise<MatchingResult[]> {
    // ユーザーが参加している全てのオープンイベントを取得
    const userEvents = await eventStorage.getParticipantEvents(userId);
    const openUserEvents = userEvents.filter(event => event.status === 'open');

    const results: MatchingResult[] = [];
    
    for (const event of openUserEvents) {
      const result = await this.checkEventMatching(event.id);
      results.push(result);
    }
    
    return results;
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
          matchedDates: [],
          participants: event.participants,
          requiredDays: event.requiredDays,
          reason: `Insufficient participants: ${event.participants.length}/${event.requiredParticipants}`
        });
        continue;
      }

      // 各参加者の空き日程を取得（ダブルブッキングを考慮）
      const availableDates = await this.findAvailableDatesWithoutConflicts(
        event,
        occupiedDates
      );

      const isMatched = availableDates.length >= event.requiredDays;
      const finalMatchedDates = isMatched ? availableDates.slice(0, event.requiredDays) : [];

      if (isMatched) {
        // イベントを成立状態に更新
        await eventStorage.updateEventStatus(event.id, 'matched', finalMatchedDates);
        
        // 占有日程を記録
        for (const participant of event.participants) {
          if (!occupiedDates.has(participant)) {
            occupiedDates.set(participant, new Set());
          }
          for (const date of finalMatchedDates) {
            occupiedDates.get(participant)!.add(date.toISOString().split('T')[0]);
          }
        }
      }

      results.push({
        eventId: event.id,
        isMatched,
        matchedDates: finalMatchedDates,
        participants: event.participants,
        requiredDays: event.requiredDays,
        reason: isMatched ? 'Successfully matched' : 'No available dates without conflicts'
      });
    }
    
    return results;
  }

  /**
   * イベントを優先度順にソート
   */
  private sortEventsByPriority(events: Event[]): Event[] {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    
    return events.sort((a, b) => {
      // 1. 優先度順
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 2. 期限が近い順
      if (a.deadline && b.deadline) {
        const deadlineDiff = a.deadline.getTime() - b.deadline.getTime();
        if (deadlineDiff !== 0) return deadlineDiff;
      }
      
      // 3. 作成日時が古い順（先着順）
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * ダブルブッキングを考慮した空き日程検索
   */
  private async findAvailableDatesWithoutConflicts(
    event: Event,
    occupiedDates: Map<string, Set<string>>
  ): Promise<Date[]> {
    // 通常の空き日程検索
    const commonDates = await this.findCommonAvailableDates(
      event.participants,
      event.requiredDays,
      event.dateMode,
      event.periodStart,
      event.periodEnd
    );

    // ダブルブッキングをチェック
    const availableDates = commonDates.filter(date => {
      const dateStr = date.toISOString().split('T')[0];
      
      // 全参加者がその日に他のイベントで占有されていないかチェック
      return event.participants.every(participant => {
        const userOccupiedDates = occupiedDates.get(participant);
        return !userOccupiedDates || !userOccupiedDates.has(dateStr);
      });
    });

    return availableDates;
  }
}

export const matchingEngine = new MatchingEngine();