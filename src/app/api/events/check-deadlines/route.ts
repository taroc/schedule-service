import { NextRequest, NextResponse } from 'next/server';
import { eventStorage } from '@/lib/eventStorage';
import { matchingEngine } from '@/lib/matchingEngine';
import { verifyToken } from '@/lib/auth';
import { MatchingTimeSlot } from '@/types/schedule';

export async function GET(request: NextRequest) {
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

    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 締め切り日が過ぎたイベントを取得
    const expiredEvents = await eventStorage.getEventsWithDeadlinesPassed();
    
    interface ProcessedEvent {
      eventId: string;
      eventName: string;
      isMatched: boolean;
      finalStatus: 'matched' | 'expired';
      matchedTimeSlots?: MatchingTimeSlot[];
      reason: string;
    }

    const processedEvents: ProcessedEvent[] = [];

    for (const event of expiredEvents) {
      try {
        // 各イベントのマッチング判定を実行
        const matchingResult = await matchingEngine.checkEventMatching(event.id);
        
        if (matchingResult.isMatched) {
          // マッチング成功時はステータスを更新
          const updateSuccess = await eventStorage.updateEventStatus(event.id, 'matched', matchingResult.matchedTimeSlots);
          processedEvents.push({
            eventId: event.id,
            eventName: event.name,
            isMatched: true,
            finalStatus: 'matched',
            matchedTimeSlots: matchingResult.matchedTimeSlots,
            reason: updateSuccess ? matchingResult.reason : 'マッチング成功したが状態更新に失敗'
          });
        } else {
          // マッチング失敗時は期限切れステータスに更新
          const updateSuccess = await eventStorage.updateEventStatus(event.id, 'expired');
          processedEvents.push({
            eventId: event.id,
            eventName: event.name,
            isMatched: false,
            finalStatus: 'expired',
            reason: updateSuccess ? matchingResult.reason : 'マッチング失敗、状態更新にも失敗'
          });
        }
      } catch (error) {
        // 個別イベントの処理でエラーが発生した場合もログを残す
        console.error(`イベント ${event.id} の処理中にエラーが発生:`, error);
        processedEvents.push({
          eventId: event.id,
          eventName: event.name,
          isMatched: false,
          finalStatus: 'expired',
          reason: 'イベント処理中にエラーが発生しました'
        });
      }
    }

    return NextResponse.json({
      processedEvents,
      totalProcessed: processedEvents.length
    });
  } catch (error) {
    console.error('Error checking deadlines:', error);
    return NextResponse.json(
      { error: '締め切り日チェック処理に失敗しました' },
      { status: 500 }
    );
  }
}