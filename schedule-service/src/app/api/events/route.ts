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

    const body: CreateEventRequest = await request.json();
    
    // バリデーション
    if (!body.name || !body.description || 
        !body.requiredParticipants || !body.requiredDays) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (body.requiredParticipants < 1 || body.requiredDays < 1) {
      return NextResponse.json(
        { error: 'Required participants and days must be greater than 0' },
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

    const event = await eventStorage.createEvent(body, user.id);
    
    return NextResponse.json(event);
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

    // ユーザー名は保存しないため、シンプルなイベント情報を返す
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}