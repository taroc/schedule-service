import { NextRequest, NextResponse } from 'next/server';
import { matchingEngine } from '@/lib/matchingEngine';
import { verifyToken } from '@/lib/auth';

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

    // グローバルマッチングを実行
    const results = await matchingEngine.globalMatching();

    return NextResponse.json({
      message: 'Global matching completed',
      results: results.map(result => ({
        ...result,
        matchedTimeSlots: result.matchedTimeSlots.map(ts => ({
          date: ts.date.toISOString(),
          timeSlot: ts.timeSlot
        }))
      }))
    });

  } catch (error) {
    console.error('Global matching error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}