import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 全ての成立済みイベントを取得
    const allMatchedEvents = await prisma.event.findMany({
      where: {
        status: 'matched'
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    console.log(`[DEBUG] Total matched events in DB: ${allMatchedEvents.length}`);
    
    // 全てのイベント（ステータス問わず）も確認
    const allEvents = await prisma.event.findMany({
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    console.log(`[DEBUG] Total events in DB: ${allEvents.length}`);
    console.log(`[DEBUG] Events by status:`, 
      allEvents.reduce((acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    );

    const response = {
      totalEvents: allEvents.length,
      matchedEvents: allMatchedEvents.length,
      eventsByStatus: allEvents.reduce((acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      matchedEventDetails: allMatchedEvents.map(event => ({
        id: event.id,
        name: event.name,
        status: event.status,
        creatorId: event.creatorId,
        participants: event.participants.map(p => p.userId),
        matchedDates: event.matchedDates
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in debug matched events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}