import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { matchingEngine } from '@/lib/matchingEngine';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 全てのオープンイベントの日程調整を実行
    const results = await matchingEngine.checkAllEvents();
    
    return NextResponse.json({
      message: 'Schedule coordination process completed',
      results,
      summary: {
        totalChecked: results.length,
        matched: results.filter(r => r.isMatched).length,
        pending: results.filter(r => !r.isMatched).length
      }
    });
  } catch (error) {
    console.error('Error in schedule coordination process:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 日程調整エンジンの統計情報を取得
    const stats = await matchingEngine.getStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting schedule coordination stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}