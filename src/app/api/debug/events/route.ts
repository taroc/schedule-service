import { NextResponse } from 'next/server';
import { eventStorage } from '@/lib/eventStorage';
import { userStorage } from '@/lib/userStorage';

export async function GET() {
  try {
    const events = await eventStorage.getAllEvents();
    
    // デバッグ情報を追加
    const debugInfo = await Promise.all(
      events.map(async (event) => {
        const creator = await userStorage.getUserById(event.creatorId);
        return {
          event,
          creatorFound: !!creator,
          creatorData: creator
        };
      })
    );
    
    return NextResponse.json({ 
      events,
      debugInfo,
      eventCount: events.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}