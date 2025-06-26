import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { getEventsByUserId, getParticipatingEvents } from '@/lib/eventStorage';

interface StatsResponse {
  createdEvents: number;
  participatingEvents: number;
  matchedEvents: number;
  pendingEvents: number;
}

interface EventSummary {
  status: 'open' | 'matched' | 'cancelled' | 'expired';
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
    
    try {
      const user = await verifyJWT(token);
      
      // データ取得とエラーハンドリング（部分的失敗に対応）
      const [createdEventsResult, participatingEventsResult] = await Promise.allSettled([
        getEventsByUserId(user.userId),
        getParticipatingEvents(user.userId)
      ]);

      // どちらも失敗した場合は500エラー
      if (createdEventsResult.status === 'rejected' && participatingEventsResult.status === 'rejected') {
        throw new Error('両方のデータ取得に失敗しました');
      }

      // 部分的失敗の場合はgraceful degradation
      const createdEvents: EventSummary[] = createdEventsResult.status === 'fulfilled' ? createdEventsResult.value : [];
      const participatingEvents: EventSummary[] = participatingEventsResult.status === 'fulfilled' ? participatingEventsResult.value : [];

      // 統計計算（型安全性を向上）
      const matchedCreated = createdEvents.filter(e => e.status === 'matched').length;
      const matchedParticipating = participatingEvents.filter(e => e.status === 'matched').length;
      const openCreated = createdEvents.filter(e => e.status === 'open').length;
      const openParticipating = participatingEvents.filter(e => e.status === 'open').length;

      const stats: StatsResponse = {
        createdEvents: createdEvents.length,
        participatingEvents: participatingEvents.length,
        matchedEvents: matchedCreated + matchedParticipating,
        pendingEvents: openCreated + openParticipating,
      };

      return NextResponse.json(stats);
    } catch (authError) {
      // 認証エラーの場合のみ401を返す
      if (authError instanceof Error && authError.message.includes('token')) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        );
      }
      // その他のエラー（DBエラーなど）は500として扱う
      throw authError;
    }
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: '統計データの取得に失敗しました' },
      { status: 500 }
    );
  }
}