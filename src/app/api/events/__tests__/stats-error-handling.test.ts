/**
 * /api/events/stats エンドポイントのエラーハンドリングテスト
 * t-wada流TDD: 最初に失敗するテストを書く
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/events/stats/route';
import { NextRequest } from 'next/server';

// モックを設定
vi.mock('@/lib/auth', () => ({
  verifyJWT: vi.fn(),
}));

vi.mock('@/lib/eventStorage', () => ({
  getEventsByUserId: vi.fn(),
  getParticipatingEvents: vi.fn(),
}));

describe('Events Stats API Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('🔴 Red Phase: データベースエラー時の適切なハンドリング', () => {
    it('データベース接続エラー時に500ではなく適切なエラーレスポンスを返すべき', async () => {
      // Arrange: 認証は成功するがDBエラーが発生する状況
      const { verifyJWT } = await import('@/lib/auth');
      const { getEventsByUserId } = await import('@/lib/eventStorage');
      
      vi.mocked(verifyJWT).mockResolvedValue({ userId: 'user1' });
      vi.mocked(getEventsByUserId).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/events/stats', {
        headers: { authorization: 'Bearer valid-token' },
      });

      // Act: API呼び出し
      const response = await GET(request);
      const data = await response.json();

      // Assert: 適切なエラーハンドリング
      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: '統計データの取得に失敗しました'
      });
      expect(data.error).not.toContain('Database connection failed'); // 技術的な詳細は隠蔽
    });

    it('部分的なデータ取得失敗時にデフォルト値を返すべき', async () => {
      // Arrange: 作成イベントは取得できるが参加イベントで失敗
      const { verifyJWT } = await import('@/lib/auth');
      const { getEventsByUserId, getParticipatingEvents } = await import('@/lib/eventStorage');
      
      vi.mocked(verifyJWT).mockResolvedValue({ userId: 'user1' });
      vi.mocked(getEventsByUserId).mockResolvedValue([]);
      vi.mocked(getParticipatingEvents).mockRejectedValue(new Error('Partial failure'));

      const request = new NextRequest('http://localhost:3000/api/events/stats', {
        headers: { authorization: 'Bearer valid-token' },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert: 部分的データでもレスポンスを返す（graceful degradation）
      expect(response.status).toBe(200);
      expect(data).toEqual({
        createdEvents: 0,
        participatingEvents: 0,
        matchedEvents: 0,
        pendingEvents: 0
      });
    });

    it('無効なトークン時に401を返すべき', async () => {
      // Arrange
      const { verifyJWT } = await import('@/lib/auth');
      
      vi.mocked(verifyJWT).mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/events/stats', {
        headers: { authorization: 'Bearer invalid-token' },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: '認証が必要です'
      });
    });

    it('トークンが存在しない時に401を返すべき', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/events/stats');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: '認証が必要です'
      });
    });

    it('予期しないエラー時に適切にログ出力して500を返すべき', async () => {
      // Arrange
      const { verifyJWT } = await import('@/lib/auth');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(verifyJWT).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/events/stats', {
        headers: { authorization: 'Bearer token' },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: '統計データの取得に失敗しました'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Stats API error:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('🟢 Green Phase: 正常系も確認', () => {
    it('正常なリクエスト時に適切な統計データを返すべき', async () => {
      // Arrange
      const { verifyJWT } = await import('@/lib/auth');
      const { getEventsByUserId, getParticipatingEvents } = await import('@/lib/eventStorage');
      
      const mockCreatedEvents = [
        { id: '1', status: 'open' },
        { id: '2', status: 'matched' }
      ];
      const mockParticipatingEvents = [
        { id: '3', status: 'matched' }
      ];

      interface MockEvent {
        id: string;
        status: 'open' | 'matched' | 'cancelled' | 'expired';
      }

      vi.mocked(verifyJWT).mockResolvedValue({ userId: 'user1' });
      vi.mocked(getEventsByUserId).mockResolvedValue(mockCreatedEvents as MockEvent[]);
      vi.mocked(getParticipatingEvents).mockResolvedValue(mockParticipatingEvents as MockEvent[]);

      const request = new NextRequest('http://localhost:3000/api/events/stats', {
        headers: { authorization: 'Bearer valid-token' },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({
        createdEvents: 2,
        participatingEvents: 1,
        matchedEvents: 2, // 作成1 + 参加1
        pendingEvents: 1  // 作成1のopen
      });
    });
  });
});