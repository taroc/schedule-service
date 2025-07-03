import { NextRequest, NextResponse } from 'next/server';
import { eventStorage } from '@/lib/eventStorage';
import { matchingEngine } from '@/lib/matchingEngine';

export async function GET(request: NextRequest) {
  // Vercel Cron認証（本番環境用）
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production') {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 締め切り日が過ぎたイベントを取得
    const expiredEvents = await eventStorage.getEventsWithDeadlinesPassed();
    
    if (expiredEvents.length === 0) {
      return NextResponse.json({
        message: 'No expired events to process',
        processedEvents: [],
        totalProcessed: 0
      });
    }

    const processedEvents = [];

    for (const event of expiredEvents) {
      try {
        console.log(`Processing expired event: ${event.id} (${event.name})`);
        
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
          console.log(`✅ Event ${event.id} matched successfully`);
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
          console.log(`❌ Event ${event.id} expired: ${matchingResult.reason}`);
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        processedEvents.push({
          eventId: event.id,
          eventName: event.name,
          isMatched: false,
          finalStatus: 'expired',
          reason: 'イベント処理中にエラーが発生しました'
        });
      }
    }

    console.log(`Processed ${processedEvents.length} expired events`);

    return NextResponse.json({
      message: `Successfully processed ${processedEvents.length} expired events`,
      processedEvents,
      totalProcessed: processedEvents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cron deadline check:', error);
    return NextResponse.json(
      { error: '締め切り日チェック処理に失敗しました' },
      { status: 500 }
    );
  }
}