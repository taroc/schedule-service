import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { scheduleStorage } from '@/lib/scheduleStorage';
import { matchingEngine } from '@/lib/matchingEngine';
import { BulkAvailabilityRequest } from '@/types/schedule';

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

    const body: BulkAvailabilityRequest = await request.json();
    
    if (!body.dates || !Array.isArray(body.dates) || body.dates.length === 0) {
      return NextResponse.json({ error: 'Dates array is required' }, { status: 400 });
    }

    if (!body.timeSlots) {
      return NextResponse.json({ 
        error: 'TimeSlots are required' 
      }, { status: 400 });
    }

    // 時間帯の検証
    const { morning, afternoon, fullday } = body.timeSlots;
    if (typeof morning !== 'boolean' || typeof afternoon !== 'boolean' || typeof fullday !== 'boolean') {
      return NextResponse.json({ 
        error: 'TimeSlots must contain boolean values for morning, afternoon, and fullday' 
      }, { status: 400 });
    }

    // 少なくとも1つの時間帯が選択されているかチェック
    if (!morning && !afternoon && !fullday) {
      return NextResponse.json({ 
        error: 'At least one time slot must be selected' 
      }, { status: 400 });
    }

    // 日付の検証
    for (const dateString of body.dates) {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ 
          error: `Invalid date: ${dateString}` 
        }, { status: 400 });
      }
    }

    // 最大日数制限
    if (body.dates.length > 100) {
      return NextResponse.json({ 
        error: 'Maximum 100 dates can be processed at once' 
      }, { status: 400 });
    }

    const schedules = await scheduleStorage.bulkSetAvailability(body, user.id);
    
    // スケジュール更新後に関連イベントのマッチング実行
    const matchingResults = await matchingEngine.onScheduleUpdated(user.id);
    
    return NextResponse.json({
      message: `Successfully registered availability for ${schedules.length} dates`,
      schedules: schedules,
      summary: {
        totalDates: schedules.length,
        timeSlots: body.timeSlots
      },
      matching: {
        eventsChecked: matchingResults.length,
        newMatches: matchingResults.filter(r => r.isMatched).length
      }
    });
  } catch (error) {
    console.error('Error registering availability:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}