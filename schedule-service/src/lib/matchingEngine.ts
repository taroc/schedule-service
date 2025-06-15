import { eventStorageDB as eventStorage } from './eventStorage';
import { scheduleStorage } from './scheduleStorage';

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
    const event = eventStorage.getEventById(eventId);
    
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
      event.requiredDays
    );

    const isMatched = matchedDates.length >= event.requiredDays;

    return {
      eventId,
      isMatched,
      matchedDates: isMatched ? matchedDates.slice(0, event.requiredDays) : [],
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
      
      // マッチした場合はイベントステータスを更新
      if (result.isMatched) {
        await eventStorage.updateEventStatus(event.id, 'matched', result.matchedDates);
      }
    }
    
    return results;
  }

  /**
   * 参加者全員の共通空き日程を検索
   */
  private async findCommonAvailableDates(
    participantIds: string[],
    requiredDays: number
  ): Promise<Date[]> {
    // 検索範囲を設定（今日から30日間）
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // 共通の空き日程を検索
    const commonDates = await scheduleStorage.getCommonAvailableDates(
      participantIds,
      startDate,
      endDate,
      requiredDays
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
      
      // マッチした場合はイベントステータスを更新
      if (result.isMatched) {
        await eventStorage.updateEventStatus(event.id, 'matched', result.matchedDates);
      }
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
}

export const matchingEngine = new MatchingEngine();