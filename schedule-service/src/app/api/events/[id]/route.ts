import { NextRequest, NextResponse } from 'next/server';
import { eventStorageDB as eventStorage } from '@/lib/eventStorage';
import { verifyToken } from '@/lib/auth';
import { UpdateEventRequest } from '@/types/event';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const event = await eventStorage.getEventById(resolvedParams.id);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // ユーザー名は保存しないため、シンプルなイベント情報を返す
    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const event = await eventStorage.getEventById(resolvedParams.id);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 作成者のみ編集可能
    if (event.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const updates: UpdateEventRequest = await request.json();
    
    // バリデーション
    if (updates.requiredParticipants && updates.requiredParticipants < 1) {
      return NextResponse.json(
        { error: 'Required participants must be greater than 0' },
        { status: 400 }
      );
    }

    if (updates.requiredDays && updates.requiredDays < 1) {
      return NextResponse.json(
        { error: 'Required days must be greater than 0' },
        { status: 400 }
      );
    }

    const updatedEvent = await eventStorage.updateEvent(resolvedParams.id, updates);
    
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const event = await eventStorage.getEventById(resolvedParams.id);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 作成者のみ削除可能
    if (event.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const success = await eventStorage.deleteEvent(resolvedParams.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}