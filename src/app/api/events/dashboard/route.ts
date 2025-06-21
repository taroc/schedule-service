import { NextRequest, NextResponse } from 'next/server';
import { eventStorage } from '@/lib/eventStorage';
import { verifyToken } from '@/lib/auth';
import { EventWithCreator, EventResponse } from '@/types/event';

interface DashboardEventsResponse {
  myCreatedEvents: EventResponse[];
  myParticipatingEvents: EventResponse[];
  availableEvents: EventResponse[];
  matchedEvents: EventResponse[];
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

    // 効率的に各カテゴリのイベントを並列取得
    const [
      myCreatedEventsData,
      myParticipatingEventsData,
      matchedEventsData,
      availableEventsData
    ] = await Promise.all([
      eventStorage.getCreatedEventsInRange(user.id),
      eventStorage.getParticipatingEventsInRange(user.id),
      eventStorage.getMatchedEventsForUser(user.id),
      eventStorage.getAvailableEventsForUser(user.id)
    ]);

    // 統計を計算（重複排除）
    const allMyEventsMap = new Map<string, EventWithCreator>();
    myCreatedEventsData.forEach(event => allMyEventsMap.set(event.id, event));
    myParticipatingEventsData.forEach(event => allMyEventsMap.set(event.id, event));
    const allMyEvents = Array.from(allMyEventsMap.values());

    const stats = {
      createdEvents: myCreatedEventsData.length,
      participatingEvents: myParticipatingEventsData.length,
      matchedEvents: matchedEventsData.length,
      pendingEvents: allMyEvents.filter(e => e.status === 'open').length,
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

    const response: DashboardEventsResponse = {
      myCreatedEvents: convertEventDates(myCreatedEventsData),
      myParticipatingEvents: convertEventDates(myParticipatingEventsData),
      availableEvents: convertEventDates(availableEventsData),
      matchedEvents: convertEventDates(matchedEventsData),
      stats
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching dashboard events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}