import { NextRequest, NextResponse } from 'next/server';
import { eventStorage } from '@/lib/eventStorage';
import { verifyToken } from '@/lib/auth';
import { EventWithCreator, EventResponse } from '@/types/event';

interface DashboardStatsResponse {
  availableEvents: EventResponse[];
  stats: {
    createdEvents: number;
    participatingEvents: number;
    matchedEvents: number;
    pendingEvents: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 統計情報と参加可能イベントのみ取得
    const [
      createdEventsCount,
      participatingEventsCount,
      matchedEventsCount,
      availableEventsData
    ] = await Promise.all([
      eventStorage.getCreatedEventsCount(user.id),
      eventStorage.getParticipatingEventsCount(user.id),
      eventStorage.getMatchedEventsCount(user.id),
      eventStorage.getAvailableEventsForUser(user.id)
    ]);

    const stats = {
      createdEvents: createdEventsCount,
      participatingEvents: participatingEventsCount,
      matchedEvents: matchedEventsCount,
      pendingEvents: createdEventsCount + participatingEventsCount - matchedEventsCount,
    };

    // DateオブジェクトをISO 8601文字列に変換
    const convertEventDates = (events: EventWithCreator[]): EventResponse[] => {
      return events.map(event => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        deadline: event.deadline ? event.deadline.toISOString() : null,
        periodStart: event.periodStart.toISOString(),
        periodEnd: event.periodEnd.toISOString(),
        matchedTimeSlots: event.matchedTimeSlots ? event.matchedTimeSlots.map(ts => ({
          date: ts.date.toISOString(),
          timeSlot: ts.timeSlot
        })) : undefined
      }));
    };

    const response: DashboardStatsResponse = {
      availableEvents: convertEventDates(availableEventsData),
      stats
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}