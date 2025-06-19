import { NextRequest, NextResponse } from 'next/server';
import { eventStorage } from '@/lib/eventStorage';
import { verifyToken } from '@/lib/auth';
import { EventWithCreator, EventResponse } from '@/types/event';

type EventListType = 'myEvents' | 'participatingEvents' | 'completedEvents';

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

    // クエリパラメータからリストタイプを取得
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as EventListType;

    if (!type || !['myEvents', 'participatingEvents', 'completedEvents'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid list type. Must be one of: myEvents, participatingEvents, completedEvents' },
        { status: 400 }
      );
    }

    let events: EventWithCreator[] = [];

    switch (type) {
      case 'myEvents':
        events = await eventStorage.getCreatedEventsInRange(user.id);
        break;
      case 'participatingEvents':
        events = await eventStorage.getParticipatingEventsInRange(user.id);
        break;
      case 'completedEvents':
        events = await eventStorage.getMatchedEventsForUser(user.id);
        break;
    }

    // DateオブジェクトをISO 8601文字列に変換
    const convertEventDates = (events: EventWithCreator[]): EventResponse[] => {
      return events.map(event => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        deadline: event.deadline ? event.deadline.toISOString() : null,
        periodStart: event.periodStart ? event.periodStart.toISOString() : undefined,
        periodEnd: event.periodEnd ? event.periodEnd.toISOString() : undefined,
        matchedDates: event.matchedDates ? event.matchedDates.map(d => d.toISOString()) : undefined
      }));
    };

    return NextResponse.json(convertEventDates(events));
  } catch (error) {
    console.error('Error fetching event list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}