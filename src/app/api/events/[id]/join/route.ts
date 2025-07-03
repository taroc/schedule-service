import { NextRequest, NextResponse } from 'next/server';
import { eventStorage } from '@/lib/eventStorage';
import { verifyToken } from '@/lib/auth';

export async function POST(
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

    // イベントがオープン状態かチェック
    if (event.status !== 'open') {
      return NextResponse.json(
        { error: 'Event is not accepting participants' },
        { status: 400 }
      );
    }

    // 期限チェック
    if (event.deadline && new Date() > event.deadline) {
      // 期限切れの場合はステータスを更新
      await eventStorage.updateEventStatus(resolvedParams.id, 'expired');
      return NextResponse.json(
        { error: 'Event deadline has passed' },
        { status: 400 }
      );
    }

    // 作成者は参加できない
    if (event.creatorId === user.id) {
      return NextResponse.json(
        { error: 'Event creator cannot join their own event' },
        { status: 400 }
      );
    }

    const result = await eventStorage.addParticipant(resolvedParams.id, user.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to join event' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: 'Successfully joined event'
    });
  } catch (error) {
    console.error('Error joining event:', error);
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
    const success = await eventStorage.removeParticipant(resolvedParams.id, user.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Not joined or failed to leave event' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Successfully left event' });
  } catch (error) {
    console.error('Error leaving event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}