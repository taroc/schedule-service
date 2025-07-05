import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { eventStorage } from '@/lib/eventStorage';

interface StatsResponse {
  createdEvents: number;
  participatingEvents: number;
  matchedEvents: number;
  pendingEvents: number;
}

interface EventSummary {
  status: 'open' | 'matched' | 'cancelled' | 'expired' | 'pending_confirmation' | 'confirmed' | 'rolled_back';
  creatorId: string;
}

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    try {
      // データ取得とエラーハンドリング（部分的失敗に対応）
      const [createdEventsResult, participatingEventsResult, matchedEventsResult] = await Promise.allSettled([
        eventStorage.getEventsByCreator(user.id),
        eventStorage.getParticipantEvents(user.id),
        eventStorage.getMatchedEventsForUser(user.id)
      ]);

      // どちらも失敗した場合は500エラー
      if (createdEventsResult.status === 'rejected' && participatingEventsResult.status === 'rejected') {
        throw new Error('両方のデータ取得に失敗しました');
      }

      // 部分的失敗の場合はgraceful degradation
      const createdEvents: EventSummary[] = createdEventsResult.status === 'fulfilled' ? createdEventsResult.value : [];
      const participatingEvents: EventSummary[] = participatingEventsResult.status === 'fulfilled' ? participatingEventsResult.value : [];
      const matchedEvents: EventSummary[] = matchedEventsResult.status === 'fulfilled' ? matchedEventsResult.value : [];

      // 統計計算（型安全性を向上）
      const openCreated = createdEvents.filter(e => e.status === 'open').length;
      const openParticipating = participatingEvents.filter(e => e.status === 'open').length;

      const stats: StatsResponse = {
        createdEvents: createdEvents.length,
        participatingEvents: participatingEvents.filter(e => e.creatorId !== user.id).length, // 自分が作成者でないものだけ
        matchedEvents: matchedEvents.length,
        pendingEvents: openCreated + openParticipating,
      };

      return NextResponse.json(stats);
    } catch (error) {
      console.error('Stats API error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: '統計データの取得に失敗しました' },
      { status: 500 }
    );
  }
}