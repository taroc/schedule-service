import { NextRequest, NextResponse } from 'next/server';
import { scheduleStorage } from '@/lib/scheduleStorage';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 });
    }

    const body = await request.json();
    const { dates, timeSlots } = body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: '日付を選択してください' }, { status: 400 });
    }

    if (!timeSlots || typeof timeSlots !== 'object') {
      return NextResponse.json({ error: '時間帯を選択してください' }, { status: 400 });
    }

    // 各日付に対して空き時間を登録
    await scheduleStorage.setAvailability(decoded.id, dates, timeSlots);

    return NextResponse.json({ 
      success: true, 
      message: `${dates.length}日の空き時間を登録しました` 
    });

  } catch (error) {
    console.error('空き時間登録エラー:', error);
    return NextResponse.json({ 
      error: '空き時間の登録に失敗しました' 
    }, { status: 500 });
  }
}