import { NextRequest, NextResponse } from 'next/server';
import { eventStorageDB as eventStorage } from '@/lib/eventStorage';
import { userStorageDB as userStorage } from '@/lib/userStorage';
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
    
    // deadlineをISO 8601文字列からDateオブジェクトに変換
    const eventRequest: CreateEventRequest = {
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : undefined
    };
    
    // バリデーション
    if (!eventRequest.name || !eventRequest.description || 
        !eventRequest.requiredParticipants || !eventRequest.requiredDays) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (eventRequest.requiredParticipants < 1 || eventRequest.requiredDays < 1) {
      return NextResponse.json(
        { error: 'Required participants and days must be greater than 0' },
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
      deadline: event.deadline ? event.deadline.toISOString() : null,
      matchedDates: event.matchedDates ? event.matchedDates.map(d => d.toISOString()) : undefined
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
    const status = searchParams.get('status');

    let events;
    
    if (creatorId) {
      events = await eventStorage.getEventsByCreator(creatorId);
    } else if (status === 'open') {
      events = await eventStorage.getOpenEvents();
    } else {
      events = await eventStorage.getAllEvents();
    }

    // DateオブジェクトをISO 8601文字列に変換してレスポンス
    const eventsResponse = events.map(event => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      deadline: event.deadline ? event.deadline.toISOString() : null,
      matchedDates: event.matchedDates ? event.matchedDates.map(d => d.toISOString()) : undefined
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