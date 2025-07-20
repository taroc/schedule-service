import { NextRequest, NextResponse } from 'next/server';
import { eventStorage } from '@/lib/eventStorage';
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

    // DateオブジェクトをISO 8601文字列に変換してレスポンス
    const eventResponse = {
      ...event,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      deadline: event.deadline ? event.deadline.toISOString() : undefined,
      periodStart: event.periodStart.toISOString(),
      periodEnd: event.periodEnd.toISOString(),
      matchedTimeSlots: event.matchedTimeSlots ? event.matchedTimeSlots.map(ts => ({
        date: ts.date.toISOString(),
        timeSlot: ts.timeSlot
      })) : undefined
    };
    
    return NextResponse.json(eventResponse);
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

    const body = await request.json();
    
    // deadlineとselectionDeadlineをISO 8601文字列からDateオブジェクトに変換
    const updates: UpdateEventRequest = {
      ...body,
      deadline: body.deadline !== undefined ? 
        (body.deadline ? new Date(body.deadline) : undefined) : 
        undefined,
      selectionDeadline: body.selectionDeadline !== undefined ?
        (body.selectionDeadline ? new Date(body.selectionDeadline) : undefined) :
        undefined
    };
    
    // バリデーション
    if (updates.requiredParticipants && updates.requiredParticipants < 1) {
      return NextResponse.json(
        { error: 'Required participants must be greater than 0' },
        { status: 400 }
      );
    }

    if (updates.requiredHours && updates.requiredHours < 1) {
      return NextResponse.json(
        { error: 'Required hours must be greater than 0' },
        { status: 400 }
      );
    }
    
    // 期限が過去の日時でないかチェック
    if (updates.deadline && updates.deadline < new Date()) {
      return NextResponse.json(
        { error: 'Deadline must be in the future' },
        { status: 400 }
      );
    }

    const updatedEvent = await eventStorage.updateEvent(resolvedParams.id, updates);
    
    if (!updatedEvent) {
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      );
    }
    
    // DateオブジェクトをISO 8601文字列に変換してレスポンス
    const eventResponse = {
      ...updatedEvent,
      createdAt: updatedEvent.createdAt.toISOString(),
      updatedAt: updatedEvent.updatedAt.toISOString(),
      deadline: updatedEvent.deadline ? updatedEvent.deadline.toISOString() : undefined,
      periodStart: updatedEvent.periodStart.toISOString(),
      periodEnd: updatedEvent.periodEnd.toISOString(),
      matchedTimeSlots: updatedEvent.matchedTimeSlots ? updatedEvent.matchedTimeSlots.map(ts => ({
        date: ts.date.toISOString(),
        timeSlot: ts.timeSlot
      })) : undefined
    };
    
    return NextResponse.json(eventResponse);
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