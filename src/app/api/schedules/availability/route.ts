'use server';

import { NextRequest, NextResponse } from 'next/server';
import { scheduleStorage } from '@/lib/scheduleStorage';
import { matchingEngine } from '@/lib/matchingEngine';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: '認証トークンが必要です' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 });
    }

    const userId = payload.id;
    const { dates, timeSlots } = await request.json();

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: '日付が必要です' }, { status: 400 });
    }

    if (!timeSlots || typeof timeSlots !== 'object') {
      return NextResponse.json({ error: '時間帯の指定が必要です' }, { status: 400 });
    }

    // バッチ処理でスケジュール登録と自動マッチングを並列実行
    const [, matchingResults] = await Promise.all([
      scheduleStorage.setAvailability(userId, dates, timeSlots),
      matchingEngine.onScheduleUpdated(userId)
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('空き時間登録エラー:', error);
    return NextResponse.json({ error: '空き時間の登録に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: '認証トークンが必要です' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 });
    }

    const userId = payload.id;
    const { dates } = await request.json();

    if (!dates || !Array.isArray(dates)) {
      return NextResponse.json({ error: '削除する日付の指定が必要です' }, { status: 400 });
    }

    // 日付文字列をDateオブジェクトに変換
    const datesToDelete = dates.map(dateStr => new Date(dateStr));

    // バッチ処理でスケジュール削除と自動マッチングを並列実行
    const [, matchingResults] = await Promise.all([
      dates.length === 0 
        ? scheduleStorage.deleteAllUserSchedules(userId)
        : scheduleStorage.deleteSchedules(userId, datesToDelete),
      matchingEngine.onScheduleUpdated(userId)
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('スケジュール削除エラー:', error);
    return NextResponse.json({ error: 'スケジュールの削除に失敗しました' }, { status: 500 });
  }
}