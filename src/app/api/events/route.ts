import { NextRequest, NextResponse } from 'next/server';
import { eventStorage } from '@/lib/eventStorage';
import { userStorage } from '@/lib/userStorage';
import { verifyToken } from '@/lib/auth';
import { CreateEventRequest } from '@/types/event';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    
    // Dateオブジェクトの変換
    const eventRequest: CreateEventRequest = {
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd)
    };
    
    // バリデーション
    if (!eventRequest.name || !eventRequest.description || 
        eventRequest.minParticipants === undefined || eventRequest.minParticipants === null ||
        !eventRequest.requiredHours || !eventRequest.deadline) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // 参加人数のバリデーション
    if (eventRequest.minParticipants < 1 || eventRequest.requiredHours < 1) {
      return NextResponse.json(
        { error: 'Minimum participants and required hours must be greater than 0' },
        { status: 400 }
      );
    }

    // 最大参加人数のバリデーション
    if (eventRequest.maxParticipants !== null && eventRequest.maxParticipants !== undefined) {
      if (eventRequest.maxParticipants < eventRequest.minParticipants) {
        return NextResponse.json(
          { error: 'Maximum participants must be greater than or equal to minimum participants' },
          { status: 400 }
        );
      }
      if (eventRequest.maxParticipants < 1) {
        return NextResponse.json(
          { error: 'Maximum participants must be greater than 0' },
          { status: 400 }
        );
      }
    }


    // 下位互換性のため requiredParticipants を minParticipants と同期
    eventRequest.requiredParticipants = eventRequest.minParticipants;

    // 期間のバリデーション
    if (!eventRequest.periodStart || !eventRequest.periodEnd) {
      return NextResponse.json(
        { error: 'Period start and end dates are required' },
        { status: 400 }
      );
    }
    
    if (eventRequest.periodStart >= eventRequest.periodEnd) {
      return NextResponse.json(
        { error: 'Period start must be before period end' },
        { status: 400 }
      );
    }

    // 期限が過去の日時でないかチェック
    if (eventRequest.deadline && eventRequest.deadline < new Date()) {
      return NextResponse.json(
        { error: 'Deadline must be in the future' },
        { status: 400 }
      );
    }

    // 作成者がUserStorageに存在するかを確認
    const creatorInStorage = await userStorage.getUserById(user.id);
    
    if (!creatorInStorage) {
      // JWTトークンのユーザーがUserStorageに存在しない場合はエラーを返す
      console.error(`Event creator ${user.id} not found in UserStorage. User needs to be logged in properly.`);
      return NextResponse.json(
        { error: 'Creator user not found. Please log in again.' },
        { status: 400 }
      );
    }

    const event = await eventStorage.createEvent(eventRequest, user.id);
    
    // レスポンスでDateオブジェクトをISO 8601文字列に変換
    const eventResponse = {
      ...event,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      deadline: event.deadline.toISOString(),
      periodStart: event.periodStart.toISOString(),
      periodEnd: event.periodEnd.toISOString(),
      matchedTimeSlots: event.matchedTimeSlots ? event.matchedTimeSlots.map(ts => ({
        date: ts.date.toISOString(),
        timeSlot: ts.timeSlot
      })) : undefined
    };
    
    return NextResponse.json(eventResponse);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const participantId = searchParams.get('participantId');
    const status = searchParams.get('status');

    let events;
    
    if (creatorId) {
      events = await eventStorage.getEventsByCreator(creatorId);
    } else if (participantId) {
      // 参加しているイベントを取得（作成者として以外）
      const participantEvents = await eventStorage.getParticipantEvents(participantId);
      events = participantEvents.filter(event => event.creatorId !== participantId);
    } else if (status === 'open') {
      // status=openの場合は認証チェックして参加可能なイベントのみ返す
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

      // ユーザーが参加可能なイベントのみを取得
      events = await eventStorage.getAvailableEventsForUser(user.id);
    } else if (status) {
      events = await eventStorage.getEventsByStatus(status as 'open' | 'matched' | 'cancelled' | 'expired');
    } else {
      events = await eventStorage.getAllEvents();
    }

    // DateオブジェクトをISO 8601文字列に変換してレスポンス
    const eventsResponse = events.map(event => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      deadline: event.deadline.toISOString(),
      periodStart: event.periodStart.toISOString(),
      periodEnd: event.periodEnd.toISOString(),
      matchedTimeSlots: event.matchedTimeSlots ? event.matchedTimeSlots.map(ts => ({
        date: ts.date.toISOString(),
        timeSlot: ts.timeSlot
      })) : undefined
    }));
    
    
    return NextResponse.json(eventsResponse);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}