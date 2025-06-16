import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { matchingEngine } from '@/lib/matchingEngine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 指定されたイベントの日程調整判定を実行
    const result = await matchingEngine.checkEventMatching(eventId);
    
    return NextResponse.json({
      message: `Schedule coordination check completed for event ${eventId}`,
      result
    });
  } catch (error) {
    console.error('Error checking event schedule coordination:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}