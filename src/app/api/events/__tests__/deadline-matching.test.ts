import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as checkDeadlines } from '../check-deadlines/route';
import { eventStorage } from '@/lib/eventStorage';
import { matchingEngine } from '@/lib/matchingEngine';
import { verifyToken } from '@/lib/auth';

// モック設定
vi.mock('@/lib/auth');
vi.mock('@/lib/eventStorage');
vi.mock('@/lib/matchingEngine');

describe('締め切り日ベースマッチング機能', () => {
  const mockUser = { id: 'user1' };
  const mockEvent = {
    id: 'event1',
    name: 'Test Event',
    description: 'Test Description',
    requiredParticipants: 2,
    requiredTimeSlots: 1,
    creatorId: 'creator1',
    status: 'open',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
    periodStart: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48時間後
    periodEnd: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72時間後
    participants: [{ userId: 'user1' }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyToken).mockReturnValue(mockUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });


  describe('締め切り日チェック機能', () => {
    it('締め切り日が来たイベントのマッチング判定を実行すべき', async () => {
      // Arrange: 締め切り日が来たイベントのセットアップ
      const expiredEvent = {
        ...mockEvent,
        deadline: new Date(Date.now() - 1000), // 1秒前（期限切れ）
        participants: [{ userId: 'user1' }, { userId: 'user2' }]
      };

      vi.mocked(eventStorage.getEventsWithDeadlinesPassed).mockResolvedValue([expiredEvent]);
      vi.mocked(matchingEngine.checkEventMatching).mockResolvedValue({
        isMatched: true,
        reason: 'Sufficient participants and common time slots found',
        matchedTimeSlots: [{ date: '2024-01-01', timeSlot: 'daytime' }]
      });

      const request = new NextRequest('http://localhost/api/events/check-deadlines', {
        method: 'GET',
        headers: { 'authorization': 'Bearer valid-token' }
      });

      // Act: 締め切り日チェックAPI呼び出し
      const response = await checkDeadlines(request);
      const data = await response.json();

      // Assert: 期限切れイベントのマッチング判定が実行されること
      expect(vi.mocked(eventStorage.getEventsWithDeadlinesPassed)).toHaveBeenCalled();
      expect(vi.mocked(matchingEngine.checkEventMatching)).toHaveBeenCalledWith('event1');
      expect(data.processedEvents).toHaveLength(1);
      expect(data.processedEvents[0].isMatched).toBe(true);
    });

    it('マッチング条件を満たさないイベントを期限切れ状態に更新すべき', async () => {
      // Arrange: 参加者不足のイベントのセットアップ
      const insufficientEvent = {
        ...mockEvent,
        deadline: new Date(Date.now() - 1000), // 1秒前（期限切れ）
        participants: [{ userId: 'user1' }] // 参加者不足
      };

      vi.mocked(eventStorage.getEventsWithDeadlinesPassed).mockResolvedValue([insufficientEvent]);
      vi.mocked(matchingEngine.checkEventMatching).mockResolvedValue({
        isMatched: false,
        reason: 'Insufficient participants',
        matchedTimeSlots: []
      });
      vi.mocked(eventStorage.updateEventStatus).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/events/check-deadlines', {
        method: 'GET',
        headers: { 'authorization': 'Bearer valid-token' }
      });

      // Act: 締め切り日チェックAPI呼び出し
      const response = await checkDeadlines(request);
      const data = await response.json();

      // Assert: 期限切れステータスに更新されること
      expect(vi.mocked(eventStorage.updateEventStatus)).toHaveBeenCalledWith('event1', 'expired');
      expect(data.processedEvents[0].isMatched).toBe(false);
      expect(data.processedEvents[0].finalStatus).toBe('expired');
    });

    it('マッチング成功時にイベントステータスを更新すべき', async () => {
      // Arrange: マッチング成功のセットアップ
      const matchableEvent = {
        ...mockEvent,
        deadline: new Date(Date.now() - 1000), // 1秒前（期限切れ）
        participants: [{ userId: 'user1' }, { userId: 'user2' }]
      };

      vi.mocked(eventStorage.getEventsWithDeadlinesPassed).mockResolvedValue([matchableEvent]);
      vi.mocked(matchingEngine.checkEventMatching).mockResolvedValue({
        isMatched: true,
        reason: 'Sufficient participants and common time slots found',
        matchedTimeSlots: [{ date: '2024-01-01', timeSlot: 'daytime' }]
      });
      vi.mocked(eventStorage.updateEventStatus).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/events/check-deadlines', {
        method: 'GET',
        headers: { 'authorization': 'Bearer valid-token' }
      });

      // Act: 締め切り日チェックAPI呼び出し
      const response = await checkDeadlines(request);
      const data = await response.json();

      // Assert: マッチング成功時にステータスが更新されること
      expect(vi.mocked(eventStorage.updateEventStatus)).toHaveBeenCalledWith('event1', 'matched', [{ date: '2024-01-01', timeSlot: 'daytime' }]);
      expect(data.processedEvents[0].finalStatus).toBe('matched');
    });
  });

  describe('エラーハンドリング', () => {
    it('認証エラー時に適切なエラーレスポンスを返すべき', async () => {
      // Arrange: 認証失敗のセットアップ
      vi.mocked(verifyToken).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/events/check-deadlines', {
        method: 'GET',
        headers: { 'authorization': 'Bearer invalid-token' }
      });

      // Act: 認証失敗でAPI呼び出し
      const response = await checkDeadlines(request);
      const data = await response.json();

      // Assert: 適切なエラーレスポンス
      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });

    it('データベースエラー時に適切なエラーレスポンスを返すべき', async () => {
      // Arrange: データベースエラーのセットアップ
      vi.mocked(eventStorage.getEventsWithDeadlinesPassed).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/events/check-deadlines', {
        method: 'GET',
        headers: { 'authorization': 'Bearer valid-token' }
      });

      // Act: データベースエラーでAPI呼び出し
      const response = await checkDeadlines(request);
      const data = await response.json();

      // Assert: 適切なエラーレスポンス
      expect(response.status).toBe(500);
      expect(data.error).toBe('締め切り日チェック処理に失敗しました');
    });
  });
});